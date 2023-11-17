import JSZip from 'jszip';
import { writeFile } from 'fs/promises';
import { FLOSUM_NAMESPACE } from '@/constants';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { Logger } from '@/modules/veeva-vault/classes/loggers/logger';
import { FlosumComponentDto } from '@/modules/veeva-vault/dtos/flosum-component.dto';
import { PackageComponentDto } from '@/modules/veeva-vault/dtos/package-component.dto';
import { DeployRequestBody } from '@/modules/veeva-vault/interfaces/request-body.interface';
import { AxiosInstance } from 'axios';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { Logger as SystemLogger } from '@/core';
import { MetadataLogStatus, PackageComponentStatus } from '@/modules/veeva-vault/enums/status.enums';
import { SalesforceDmlError } from '@/modules/veeva-vault/classes/errors/salesforce-dml-error';
import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import shortid from 'shortid';
import { fetchAttachmentsDetailsByParentId, retrieveAttachments } from '@/modules/shared/utils/fetch-attachments';
import { PackageImportService } from '@/modules/veeva-vault/services/package-import.service';
import { BranchComponentHistoryFlosumComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/flosum-components/branch-component-history.flosum-component.retriever';
import { FlosumComponentVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/flosum-component.veeva-component.retriever';
import { PackageExportService } from '@/modules/veeva-vault/services/package-export.service';
import { VpkService } from '@/modules/veeva-vault/services/vpk.service';
import { ZipCreatorDeploy } from '@/modules/veeva-vault/classes/deploy/zip-creator.deploy';

export class DeployService {
  private readonly _branchId: string;
  private readonly _metadataLogId: string;
  private readonly _attachmentLogId: string;
  private readonly _organisationId: string;
  private readonly _timeZone: string;
  private readonly _organisationName: string;
  private readonly _componentIdList: string[];
  private readonly _deploymentName: string;
  private readonly _systemLogger: SystemLogger;

  private readonly _veevaService: VeevaService;
  private readonly _salesforceService: SalesforceService;
  private readonly _packageImportService: PackageImportService;
  private readonly _packageExportService: PackageExportService;
  private readonly _vpkService: VpkService;

  constructor(
    body: DeployRequestBody,
    private readonly _connectionSalesforce: AxiosInstance,
    private readonly _connectionVeeva: AxiosInstance,
    private readonly _logger: Logger,
    private readonly _tempFolder: string,
    private readonly _instanceUrl: string
  ) {
    this._branchId = body.branchId;
    this._metadataLogId = body.metadataLogId;
    this._attachmentLogId = body.attachmentLogId;
    this._organisationId = body.organisationId;
    this._timeZone = body.timeZone;
    this._organisationName = body.organisationName;
    this._componentIdList = body.componentIdList;
    this._deploymentName = body.deploymentName;
    this._systemLogger = new SystemLogger('veeva-deploy');

    this._veevaService = new VeevaService({ connection: this._connectionVeeva, logger: this._logger });
    this._salesforceService = new SalesforceService({ connection: this._connectionSalesforce });

    this._packageImportService = new PackageImportService({
      veevaService: this._veevaService,
      connection: this._connectionVeeva,
      logger: this._logger,
      saveLog: this.saveLog.bind(this),
    });

    this._packageExportService = new PackageExportService({
      veevaService: this._veevaService,
      connection: this._connectionVeeva,
      logger: this._logger,
    });

    this._vpkService = new VpkService({ connection: this._connectionVeeva });
  }

  public async execute(): Promise<void> {
    try {
      const componentList = await this.getFlosumComponents();

      await this._logger.updateLog();

      const backupBody = await this.createBackup(componentList);
      await this.saveBackup(backupBody);

      const attachmentBodyList = await this.retrieveAttachments(componentList);

      const mainZipPath = await this.createZip(attachmentBodyList);

      const vpkPath = await this.createVpk(mainZipPath);

      await this._logger.updateLog();

      const packageDetailsDto = await this._packageImportService.import(vpkPath);

      await this._logger.updateLog();

      const flosumDeploymentResults = this.formFlosumDeploymentResults(
        componentList,
        packageDetailsDto.packageComponentList
      );

      await this.saveDeploymentResults(flosumDeploymentResults);

      await this.finishDeploy(packageDetailsDto.isDeployed, false, packageDetailsDto.packageId);
    } catch (error) {
      await this.finishDeployWithError(error).catch((error) => this._systemLogger.error(error));
    }
  }

  private async getFlosumComponents(): Promise<FlosumComponentDto[]> {
    const componentIdSet = new Set(this._componentIdList);
    this._logger.log('Retrieving components');

    const components = await new BranchComponentHistoryFlosumComponentRetriever({
      value: this._branchId,
      salesforceService: this._salesforceService,
    }).retrieve();

    const filteredComponents = components.filter((component) => componentIdSet.has(component.id));

    if (filteredComponents.length !== this._componentIdList.length) {
      throw new Error('Cannot retrieve all components.');
    }

    return filteredComponents;
  }

  private async createBackup(componentList: FlosumComponentDto[]): Promise<string> {
    this._logger.log('Create Backup');

    const veevaComponents = await new FlosumComponentVeevaComponentRetriever({
      value: componentList,
      veevaService: this._veevaService,
      logger: this._logger,
    }).retrieve();

    const zipList = await this._packageExportService.export(veevaComponents, 'Backup');

    if (zipList.length > 1) {
      throw new Error('Cannot Backup more than 200 components.');
    }

    zipList[0] ??= new JSZip();

    return zipList[0].generateAsync({ type: 'base64' });
  }

  private async saveBackup(backupBody: string): Promise<void> {
    this._logger.log('Save Backup to Salesforce');

    const attachment = {
      Body: backupBody,
      ContentType: 'application/zip',
      ParentId: this._metadataLogId,
      Name: FlosumConstants.BACKUP_ZIP_NAME,
    };

    await this._connectionSalesforce.post(`${FlosumConstants.ENDPOINT_UPSERT_RECORD}/Attachment`, attachment);
  }

  private async retrieveAttachments(componentList: FlosumComponentDto[]): Promise<string[]> {
    this._logger.log('Retrieving attachments');
    const attachmentDetails = await fetchAttachmentsDetailsByParentId(
      this._connectionSalesforce,
      componentList.map((component) => component.componentHistoryId)
    );
    const attachments = await retrieveAttachments(attachmentDetails, this._connectionSalesforce);

    if (attachments.length !== this._componentIdList.length) {
      throw new Error('Cannot retrievers all attachments');
    }

    return attachments.map((item) => item.values.Body);
  }

  private async createZip(attachmentBodies: string[]): Promise<string> {
    this._logger.log('Join all mdl into one zip');

    const zipBuffer = await new ZipCreatorDeploy({
      attachmentBodies,
      deploymentName: this._deploymentName,
    }).execute();

    const path = `${this._tempFolder}/${shortid()}.zip`;
    await writeFile(path, zipBuffer);

    return path;
  }

  private async createVpk(zipPath: string): Promise<string> {
    this._logger.log('Create vpk package');

    const vpk = await this._vpkService.generate(zipPath);

    const path = `${this._tempFolder}/vpk__${zipPath.slice(zipPath.lastIndexOf('/') + 1)}`;
    await writeFile(path, vpk);

    await this._vpkService.validate(path);

    return path;
  }

  private async saveLog(body: string, name: string): Promise<void> {
    this._logger.log('Save log');

    const attachment = {
      Body: Buffer.from(body).toString('base64'),
      ContentType: 'text/plain',
      ParentId: this._metadataLogId,
      Name: name,
    };

    await this._connectionSalesforce.post(`${FlosumConstants.ENDPOINT_UPSERT_RECORD}/Attachment`, attachment);
  }

  private formFlosumDeploymentResults(
    componentList: FlosumComponentDto[],
    packageComponentList: PackageComponentDto[]
  ): Record<string, any>[] {
    this._logger.log('Form Deployment Results');
    const uniqueNameToComponentMap = componentList.reduce(
      (map, component) => map.set(`${component.componentType}.${component.componentName}`.toLowerCase(), component),
      new Map()
    );

    return packageComponentList.map((packageComponent) => {
      this._logger.log(`${packageComponent.type}.${packageComponent.name} : ${packageComponent.status}`);
      const packageComponentFullName = `${packageComponent.type}.${packageComponent.name}`.toLowerCase();
      const component = uniqueNameToComponentMap.get(packageComponentFullName);
      return {
        [`${FLOSUM_NAMESPACE}Type__c`]: 'Deployment Result',
        [`${FLOSUM_NAMESPACE}Status__c`]:
          packageComponent.status === PackageComponentStatus.DEPLOYED ? 'Success' : 'Failure',
        [`${FLOSUM_NAMESPACE}Result__c`]: packageComponent.deploymentAction,
        [`${FLOSUM_NAMESPACE}Component_Name__c`]: packageComponent.name,
        [`${FLOSUM_NAMESPACE}Component_Type__c`]: packageComponent.type,
        [`${FLOSUM_NAMESPACE}Veeva_Step_Name__c`]: packageComponent.stepName,
        [`${FLOSUM_NAMESPACE}Org__c`]: this._organisationId,
        [`${FLOSUM_NAMESPACE}Metadata_Log__c`]: this._metadataLogId,
        [`${FLOSUM_NAMESPACE}Component_History__c`]: component.componentHistoryId,
      };
    });
  }

  private async saveDeploymentResults(deploymentResultList: Record<string, any>[]): Promise<void> {
    this._logger.log('Save Deployment Results');

    const records = await this._salesforceService.insertMultipleRecords(
      `${FLOSUM_NAMESPACE}Deployment_Result__c`,
      deploymentResultList
    );

    const errors = records
      .filter((record) => !record.success)
      .map((record) => record.errors)
      .flat();

    if (errors.length) {
      throw new SalesforceDmlError(errors);
    }
  }

  private async finishDeployWithError(error: Error | BaseVeevaError<any>): Promise<void> {
    this._logger.logError(error);
    await this._logger.updateLog();
    await this.finishDeploy(false, true, '');
  }

  private async finishDeploy(isSuccess: boolean, isException: boolean, packageId: string): Promise<void> {
    const dep = '<a href=' + this._instanceUrl + '/' + this._metadataLogId + ' > ' + 'Veeva Deployment' + ' </a>';
    const org = '<a href=' + this._instanceUrl + '/' + this._organisationId + ' >' + this._organisationName + '</a>';
    const action = dep + ' of branch to Organization ' + org + ' has been created.';

    const log = {
      [`${FLOSUM_NAMESPACE}Action__c`]: action,
      [`${FLOSUM_NAMESPACE}Date__c`]: new Date(),
      [`${FLOSUM_NAMESPACE}Branch__c`]: this._branchId,
      [`${FLOSUM_NAMESPACE}Activity_Item__c`]: 'Branch',
      [`${FLOSUM_NAMESPACE}Activity_Type__c`]: 'Deployment',
      [`${FLOSUM_NAMESPACE}TargetId__c`]: this._organisationId,
    };

    const metadataLog = {
      [`${FLOSUM_NAMESPACE}Is_Error__c`]: !isSuccess,
      [`${FLOSUM_NAMESPACE}Succeed__c`]: isSuccess,
      [`${FLOSUM_NAMESPACE}Status__c`]: isException ? MetadataLogStatus.EXCEPTION : MetadataLogStatus.COMPLETED,
      [`${FLOSUM_NAMESPACE}Job_Completed__c`]: true,
      [`${FLOSUM_NAMESPACE}Async_Request_Id__c`]: packageId,
    };

    await this._connectionSalesforce.patch(
      `${FlosumConstants.ENDPOINT_UPSERT_RECORD}/${FLOSUM_NAMESPACE}Metadata_Log__c/${this._metadataLogId}`,
      metadataLog
    );

    await this._connectionSalesforce.post(`${FlosumConstants.ENDPOINT_UPSERT_RECORD}/${FLOSUM_NAMESPACE}Log__c`, log);

    this._logger.log(`Deploy completed ${isSuccess ? 'successfully' : 'with error'}.`);
    await this._logger.updateLog();
  }
}
