import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { PackageImportService } from '@/modules/veeva-vault/services/package-import.service';
import { AxiosInstance } from 'axios';
import { Logger } from '@/modules/veeva-vault/classes/loggers/logger';
import { RollbackRequestBody } from '@/modules/veeva-vault/interfaces/request-body.interface';
import { IdDeploymentResultRetriever } from '@/modules/veeva-vault/classes/retrievers/deployment-results/id.deployment-result.retriever';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';
import { fetchAttachmentsDetailsById, retrieveAttachments } from '@/modules/shared/utils/fetch-attachments';
import { DeploymentResultDto } from '@/modules/veeva-vault/dtos/deployment-result.dto';
import { FLOSUM_NAMESPACE } from '@/constants';
import { ZipCreatorRollback } from '@/modules/veeva-vault/classes/rollback/zip-creator.rollback';
import shortid from 'shortid';
import { writeFile } from 'fs/promises';
import { VpkService } from '@/modules/veeva-vault/services/vpk.service';
import { PackageComponentDto } from '@/modules/veeva-vault/dtos/package-component.dto';
import { MetadataLogStatus, PackageComponentStatus } from '@/modules/veeva-vault/enums/status.enums';
import { SalesforceDmlError } from '@/modules/veeva-vault/classes/errors/salesforce-dml-error';
import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { MetadataLogDto } from '@/modules/veeva-vault/dtos/metadata-log.dto';
import { Logger as SystemLogger } from '@/core';

export type RollbackServiceOptions = {
  connectionSalesforce: AxiosInstance;
  connectionVeeva: AxiosInstance;
  logger: Logger;
  tempFolder: string;
  instanceUrl: string;
} & Omit<RollbackRequestBody, 'veevaAuth'>;

export class RollbackService {
  private readonly _connectionSalesforce: RollbackServiceOptions['connectionSalesforce'];
  private readonly _connectionVeeva: RollbackServiceOptions['connectionVeeva'];
  private readonly _logger: RollbackServiceOptions['logger'];
  private readonly _tempFolder: RollbackServiceOptions['tempFolder'];
  private readonly _instanceUrl: RollbackServiceOptions['instanceUrl'];
  private readonly _timeZone: RollbackServiceOptions['timeZone'];
  private readonly _metadataLogId: RollbackServiceOptions['metadataLogId'];
  private readonly _attachmentLogId: RollbackServiceOptions['attachmentLogId'];
  private readonly _parentMetadataLogId: RollbackServiceOptions['parentMetadataLogId'];
  private readonly _componentIds: RollbackServiceOptions['componentIds'];

  private readonly _systemLogger: SystemLogger;

  private readonly _veevaService: VeevaService;
  private readonly _salesforceService: SalesforceService;
  private readonly _packageImportService: PackageImportService;
  private readonly _vpkService: VpkService;

  private _metadataLog: MetadataLogDto;

  constructor({
    connectionSalesforce,
    connectionVeeva,
    logger,
    tempFolder,
    instanceUrl,
    timeZone,
    metadataLogId,
    attachmentLogId,
    parentMetadataLogId,
    componentIds,
  }: RollbackServiceOptions) {
    this._connectionSalesforce = connectionSalesforce;
    this._connectionVeeva = connectionVeeva;
    this._logger = logger;
    this._tempFolder = tempFolder;
    this._instanceUrl = instanceUrl;
    this._timeZone = timeZone;
    this._metadataLogId = metadataLogId;
    this._attachmentLogId = attachmentLogId;
    this._parentMetadataLogId = parentMetadataLogId;
    this._componentIds = componentIds;
    this._systemLogger = new SystemLogger('veeva-rollback');

    this._veevaService = new VeevaService({ connection: connectionVeeva, logger });

    this._salesforceService = new SalesforceService({ connection: connectionSalesforce });

    this._packageImportService = new PackageImportService({
      veevaService: this._veevaService,
      connection: connectionVeeva,
      logger,
      saveLog: this.saveLog.bind(this),
    });

    this._vpkService = new VpkService({ connection: connectionVeeva });
  }

  private async saveLog(logData: string, name: string): Promise<void> {
    this._logger.log('Save log');

    const attachment = {
      Body: Buffer.from(logData).toString('base64'),
      ContentType: 'text/plain',
      ParentId: this._metadataLogId,
      Name: name,
    };

    await this._connectionSalesforce.post(`${FlosumConstants.ENDPOINT_UPSERT_RECORD}/Attachment`, attachment);
  }

  private async retrieveMetadataLog(): Promise<MetadataLogDto> {
    this._logger.log('Retrieve Metadata Log info');

    const [record] = await this._salesforceService.retrieveRecords(`
      SELECT 
              Id, 
              Name, 
              ${FLOSUM_NAMESPACE}Organisation__c, 
              ${FLOSUM_NAMESPACE}Organisation__r.Name, 
              ${FLOSUM_NAMESPACE}Branch__c
      FROM ${FLOSUM_NAMESPACE}Metadata_Log__c
      WHERE Id = '${this._metadataLogId}'
    `);

    return new MetadataLogDto(record);
  }

  private async retrieveDeploymentResults(): Promise<DeploymentResultDto[]> {
    this._logger.log('Retrieve Deployment Results');

    const deploymentResults = await new IdDeploymentResultRetriever({
      salesforceService: this._salesforceService,
      value: this._componentIds,
    }).retrieve();

    if (!deploymentResults.length) {
      throw new Error('Cannot find Deployment Results');
    }

    return deploymentResults;
  }

  private async retrieveBackup(): Promise<string> {
    this._logger.log('Retrieve Backup');
    const records = await this._salesforceService.retrieveRecords(`
      SELECT Id
      FROM Attachment
      WHERE ParentId = '${this._parentMetadataLogId}' AND Name = '${FlosumConstants.BACKUP_ZIP_NAME}'
    `);

    const attachmentDetails = await fetchAttachmentsDetailsById(this._connectionSalesforce, [records[0].Id]);
    const attachments = await retrieveAttachments(attachmentDetails, this._connectionSalesforce);

    if (!attachments.length) {
      throw new Error('Cannot find Backup Zip');
    }

    return attachments[0].values.Body;
  }

  private async createZip(deploymentResults: DeploymentResultDto[]): Promise<string> {
    this._logger.log('Create zip from backup');

    const backup = await this.retrieveBackup();

    const zip = await new ZipCreatorRollback({
      rollbackName: this._metadataLog.name,
      backup,
      deploymentResults,
    }).create();

    const path = `${this._tempFolder}/${shortid()}.zip`;
    await writeFile(path, zip);

    return path;
  }

  private async createVpk(zipPath: string): Promise<string> {
    this._logger.log('Create Vpk package');
    const vpk = await this._vpkService.generate(zipPath);

    const path = `${this._tempFolder}/vpk__${zipPath.slice(zipPath.lastIndexOf('/') + 1)}`;
    await writeFile(path, vpk);

    await this._vpkService.validate(path);

    return path;
  }

  private formFlosumDeploymentResults(packageComponentList: PackageComponentDto[]): Record<string, any>[] {
    this._logger.log('Form Deployment Results');

    return packageComponentList.map((packageComponent) => {
      this._logger.log(`${packageComponent.type}.${packageComponent.name} : ${packageComponent.status}`);
      return {
        [`${FLOSUM_NAMESPACE}Type__c`]: 'Deployment Result',
        [`${FLOSUM_NAMESPACE}Status__c`]:
          packageComponent.status === PackageComponentStatus.DEPLOYED ? 'Success' : 'Failure',
        [`${FLOSUM_NAMESPACE}Result__c`]: packageComponent.deploymentAction,
        [`${FLOSUM_NAMESPACE}Component_Name__c`]: packageComponent.name,
        [`${FLOSUM_NAMESPACE}Component_Type__c`]: packageComponent.type,
        [`${FLOSUM_NAMESPACE}Veeva_Step_Name__c`]: packageComponent.stepName,
        [`${FLOSUM_NAMESPACE}Org__c`]: this._metadataLog.organizationId,
        [`${FLOSUM_NAMESPACE}Metadata_Log__c`]: this._metadataLogId,
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

  private async finishRollbackWithError(error: Error | BaseVeevaError<any>): Promise<void> {
    if (!this._metadataLog) {
      this._systemLogger.error(error);
      return;
    }

    this._logger.logError(error);
    await this._logger.updateLog();
    await this.finishRollback(false, true, '');
  }

  private async finishRollback(isSuccess: boolean, isException: boolean, packageId: string): Promise<void> {
    const { id: metadataLogId, organizationId, branchId, organizationName } = this._metadataLog;

    const dep = '<a href=' + this._instanceUrl + '/' + metadataLogId + ' > ' + 'Veeva Rollback (Deployment)' + ' </a>';
    const org = '<a href=' + this._instanceUrl + '/' + organizationId + ' >' + organizationName + '</a>';
    const action = dep + ' of branch to Organization ' + org + ' has been created.';

    const log = {
      [`${FLOSUM_NAMESPACE}Action__c`]: action,
      [`${FLOSUM_NAMESPACE}Date__c`]: new Date(),
      [`${FLOSUM_NAMESPACE}Branch__c`]: branchId,
      [`${FLOSUM_NAMESPACE}Activity_Item__c`]: 'Branch',
      [`${FLOSUM_NAMESPACE}Activity_Type__c`]: 'Deployment',
      [`${FLOSUM_NAMESPACE}TargetId__c`]: organizationId,
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

    this._logger.log(`Rollback completed ${isSuccess ? 'successfully' : 'with error'}.`);
    await this._logger.updateLog();
  }

  public async execute(): Promise<void> {
    try {
      this._metadataLog = await this.retrieveMetadataLog();

      const deploymentResults = await this.retrieveDeploymentResults();

      await this._logger.updateLog();

      const zipPath = await this.createZip(deploymentResults);
      const vpkPath = await this.createVpk(zipPath);

      await this._logger.updateLog();

      const packageDetails = await this._packageImportService.import(vpkPath);

      await this._logger.updateLog();

      const flosumDeploymentResults = this.formFlosumDeploymentResults(packageDetails.packageComponentList);

      await this.saveDeploymentResults(flosumDeploymentResults);

      await this.finishRollback(packageDetails.isDeployed, false, packageDetails.packageId);
    } catch (error) {
      await this.finishRollbackWithError(error).catch((error) => this._systemLogger.error(error));
    }
  }
}
