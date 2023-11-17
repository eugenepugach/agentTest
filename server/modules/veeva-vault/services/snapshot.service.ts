import JSZip from 'jszip';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { Logger } from '@/modules/veeva-vault/classes/loggers/logger';
import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';
import { MetadataItemDto } from '@/modules/veeva-vault/dtos/metadata-item.dto';
import { SnapshotRequestBody } from '@/modules/veeva-vault/interfaces/request-body.interface';
import { FLOSUM_NAMESPACE } from '@/constants';
import { AxiosInstance } from 'axios';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { MetadataLogStatus } from '@/modules/veeva-vault/enums/status.enums';
import { SalesforceDmlError } from '@/modules/veeva-vault/classes/errors/salesforce-dml-error';
import { Logger as SystemLogger } from '@/core';
import { PackageExportService } from '@/modules/veeva-vault/services/package-export.service';
import { TypeAndNameVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/type-and-name.veeva-component.retriever';
import { TypeVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/type.veeva-component.retriever';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import path from 'path';

export class SnapshotService {
  private static readonly OUTBOUND_PACKAGE_NAME = 'Snapshot';
  private static readonly ATTACHMENT = 'Attachment';

  private readonly _snapshotId: string;
  private readonly _metadataLogId: string;
  private readonly _attachmentLogId: string;
  private readonly _timeZone: string;
  private readonly _selectedMetaTypes: string[];
  private readonly _selectedComponentMap: Record<string, string[]>;
  private readonly _systemLogger: SystemLogger;

  private readonly _veevaService: VeevaService;
  private readonly _salesforceService: SalesforceService;
  private readonly _packageExportService: PackageExportService;

  constructor(
    body: SnapshotRequestBody,
    private readonly _connectionSalesforce: AxiosInstance,
    private readonly _connectionVeeva: AxiosInstance,
    private readonly _logger: Logger
  ) {
    this._snapshotId = body.snapshotId;
    this._metadataLogId = body.metadataLogId;
    this._attachmentLogId = body.attachmentLogId;
    this._timeZone = body.timeZone;
    this._selectedMetaTypes = body.selectedMetaTypes;
    this._selectedComponentMap = body.selectedComponentMap;

    this._veevaService = new VeevaService({ connection: this._connectionVeeva, logger: this._logger });
    this._salesforceService = new SalesforceService({ connection: this._connectionSalesforce });
    this._packageExportService = new PackageExportService({
      veevaService: this._veevaService,
      connection: this._connectionVeeva,
      logger: this._logger,
    });
  }

  public async execute(): Promise<void> {
    try {
      this._logger.log('Snapshot started.');
      const veevaComponentDtoList = await this.retrieveVeevaComponents();

      await this._logger.updateLog();

      const zipList = await this._packageExportService.export(
        veevaComponentDtoList,
        SnapshotService.OUTBOUND_PACKAGE_NAME
      );

      await this._logger.updateLog();

      const metadataItemDtoList = await this.createMetadataItemListWithBody(veevaComponentDtoList, zipList);

      await this.saveComponentsInSalesforce(metadataItemDtoList);
      await this._logger.updateLog();

      await this.finishSnapshot(true);
    } catch (error) {
      this._logger.logError(error);
      await this.finishSnapshot(false).catch((error) => this._systemLogger.error(error));
    }
  }

  private async retrieveVeevaComponents(): Promise<VeevaComponentDto[]> {
    const baseOptions = {
      veevaService: this._veevaService,
      logger: this._logger,
    };

    const retriever = Array.from(Object.values(this._selectedComponentMap)).length
      ? new TypeAndNameVeevaComponentRetriever({ value: this._selectedComponentMap, ...baseOptions })
      : new TypeVeevaComponentRetriever({ value: this._selectedMetaTypes, ...baseOptions });

    return retriever.retrieve();
  }

  private async createMetadataItemListWithBody(
    veevaComponentDtoList: VeevaComponentDto[],
    zipList: JSZip[]
  ): Promise<MetadataItemDto[]> {
    this._logger.log('Unpack zip and create metadata items.');
    const metadataItemDtoList = this.formMetadataItemDtoList(veevaComponentDtoList);
    const labelToMetadataItemMap = metadataItemDtoList.reduce((map, item) => map.set(item.label, item), new Map());

    for (const zip of zipList) {
      for (const fileName in zip.files) {
        const { base: mdlBase, name, dir } = path.parse(fileName);
        const dependencyBase = name + VeevaConstants.DEPENDENCY_EXTENSION;

        if (labelToMetadataItemMap.has(mdlBase)) {
          const decodeBodyMdl = await zip.file(path.join(dir, mdlBase))?.async('string');
          const decodeBodyDependency = await zip.file(path.join(dir, dependencyBase))?.async('string');

          if (decodeBodyMdl && decodeBodyDependency) {
            const newZip = new JSZip();
            newZip.file(mdlBase, decodeBodyMdl);
            newZip.file(dependencyBase, this.transformDependencyFile(decodeBodyDependency));
            labelToMetadataItemMap.get(mdlBase).body = await newZip.generateAsync({ type: 'base64' });
          }
        }
      }
    }

    metadataItemDtoList
      .filter((item) => !item.body)
      .forEach((item) => {
        this._logger.log(`Cannot retrieve ${item.veevaComponentType}.${item.name} from outbound package`);
      });

    return metadataItemDtoList.filter((item) => item.body);
  }

  private transformDependencyFile(dependencyFile: string): string {
    const records: any[] = csvParse(dependencyFile, {
      columns: true,
      skip_empty_lines: true,
    });

    const newRecords = records.map(({ 'In Package': _inPackage, ...otherColumns }) => otherColumns);

    return csvStringify(newRecords, { header: true });
  }

  private formMetadataItemDtoList(veevaComponentDtoList: VeevaComponentDto[]): MetadataItemDto[] {
    return veevaComponentDtoList.map((component) => {
      const metadataItemDto = new MetadataItemDto();
      metadataItemDto.name = component.name;
      metadataItemDto.apiName = component.name;
      metadataItemDto.snapshotId = this._snapshotId;
      metadataItemDto.label = `${component.type}.${component.name}${VeevaConstants.MDL_EXTENSION}`;
      metadataItemDto.veevaComponentType = component.type;
      metadataItemDto.lastModifiedDate = component.lastModifiedDate;
      metadataItemDto.isRetrieved = false;

      return metadataItemDto;
    });
  }

  private async saveComponentsInSalesforce(metadataItemsDtoList: MetadataItemDto[]): Promise<void> {
    this._logger.log('Saving Attachments.');
    await this.saveAttachments(metadataItemsDtoList);

    this._logger.log(`Saving ${metadataItemsDtoList.length} Metadata Items`);
    const metadataItemListSalesforce = metadataItemsDtoList.map((item: MetadataItemDto) => {
      return {
        [`${FLOSUM_NAMESPACE}Name__c`]: item.name,
        [`${FLOSUM_NAMESPACE}API_Name__c`]: item.apiName,
        [`${FLOSUM_NAMESPACE}Snapshot__c`]: item.snapshotId,
        [`${FLOSUM_NAMESPACE}Label__c`]: item.label,
        [`${FLOSUM_NAMESPACE}Is_Retrieved__c`]: item.isRetrieved,
        [`${FLOSUM_NAMESPACE}Veeva_Component_Type__c`]: item.veevaComponentType,
        [`${FLOSUM_NAMESPACE}Attachment_ID__c`]: item.attachmentId,
        [`${FLOSUM_NAMESPACE}Last_Modified_Date__c`]: item.lastModifiedDate,
      };
    });

    const records = await this._salesforceService.insertMultipleRecords(
      `${FLOSUM_NAMESPACE}Metadata_Item__c`,
      metadataItemListSalesforce
    );

    let isSuccessSaved = true;
    records.forEach((record, i) => {
      this._logger.log(`Saving ${metadataItemsDtoList[i].veevaComponentType}.${metadataItemsDtoList[i].name}`);
      if (!record.success) {
        isSuccessSaved = false;
        const error = new SalesforceDmlError(record.errors);
        this._logger.logError(error);
      }
    });

    if (!isSuccessSaved) {
      throw new Error('Cannot Save Metadata Items');
    }
  }

  private async saveAttachments(metadataItemsDtoList: MetadataItemDto[]): Promise<void> {
    const attachmentList = this.formAttachments(metadataItemsDtoList);

    const records = await this._salesforceService.insertMultipleRecords(SnapshotService.ATTACHMENT, attachmentList);

    const errors: any[] = [];
    records.forEach((record, i) => {
      if (record.success) {
        metadataItemsDtoList[i].attachmentId = record.id;
        metadataItemsDtoList[i].isRetrieved = true;
      } else {
        errors.push(...record.errors);
      }
    });

    if (errors.length) {
      throw new SalesforceDmlError(errors);
    }
  }

  private formAttachments(metadataItemsDtoList: MetadataItemDto[]): Record<string, any>[] {
    return metadataItemsDtoList.map((item) => ({
      ParentId: this._snapshotId,
      Name: item.veevaComponentType,
      ContentType: 'application/zip',
      Body: item.body,
      Description: item.veevaComponentType,
    }));
  }

  private async finishSnapshot(isSuccess: boolean): Promise<void> {
    const snapshot = {
      [`${FLOSUM_NAMESPACE}Is_Completed__c`]: true,
      [`${FLOSUM_NAMESPACE}Is_Error__c`]: !isSuccess,
    };

    const metadataLog = {
      [`${FLOSUM_NAMESPACE}Is_Error__c`]: !isSuccess,
      [`${FLOSUM_NAMESPACE}Succeed__c`]: isSuccess,
      [`${FLOSUM_NAMESPACE}Status__c`]: isSuccess ? MetadataLogStatus.COMPLETED : MetadataLogStatus.EXCEPTION,
      [`${FLOSUM_NAMESPACE}Job_Completed__c`]: true,
    };

    await this._connectionSalesforce.patch(
      `${FlosumConstants.ENDPOINT_UPSERT_RECORD}/${FLOSUM_NAMESPACE}Snapshot__c/${this._snapshotId}`,
      snapshot
    );

    await this._connectionSalesforce.patch(
      `${FlosumConstants.ENDPOINT_UPSERT_RECORD}/${FLOSUM_NAMESPACE}Metadata_Log__c/${this._metadataLogId}`,
      metadataLog
    );

    this._logger.log(`Snapshot completed ${isSuccess ? 'successfully' : 'with error'}.`);
    await this._logger.updateLog();
  }
}
