import { DeployDataResult, RestSimpleDeployData, SFRecord } from '@flosum/salesforce';
import { LogStatus } from '@/modules/tracking-metadata/constants';
import { FLOSUM_NAMESPACE } from '@/constants';
import { AxiosInstance } from 'axios';

const METADATA_LOG_OBJECT_NAME = `${FLOSUM_NAMESPACE}Metadata_Log__c`;
const PROCESS_TYPE_RETRIEVE_ORGANIZATION = 'Tracking Organization - Retrieve';

export interface MetadataLoggerOptions {
  apiVersion: string;
  instance: AxiosInstance;
  targetOrgId: string;
  trackingSettingId: string;
  startDate: number;
}

export class MetadataLogger {
  private readonly apiVersion: MetadataLoggerOptions['apiVersion'];
  private readonly instance: MetadataLoggerOptions['instance'];
  private readonly targetOrgId: MetadataLoggerOptions['targetOrgId'];
  private readonly trackingSettingId: MetadataLoggerOptions['trackingSettingId'];
  private readonly startDate: MetadataLoggerOptions['startDate'];

  private _status: LogStatus;
  private metadataLog: SFRecord;
  private metadataLogId: string;

  public set status(status: LogStatus) {
    this._status = status;
  }

  constructor({ apiVersion, instance, targetOrgId, trackingSettingId, startDate }: MetadataLoggerOptions) {
    this.apiVersion = apiVersion;
    this.instance = instance;
    this.targetOrgId = targetOrgId;
    this.trackingSettingId = trackingSettingId;
    this.startDate = startDate;
  }

  private async deployMetadataLog(): Promise<DeployDataResult[]> {
    const deployer = new RestSimpleDeployData({
      instance: this.instance,
      objectName: METADATA_LOG_OBJECT_NAME,
      api: this.apiVersion,
      allOrNone: false,
      externalIdField: 'Id',
    });

    return await deployer.execute({ records: [this.metadataLog] });
  }

  private createMetadataLog(): void {
    this.metadataLog = {
      attributes: { type: METADATA_LOG_OBJECT_NAME },
      Id: this.metadataLogId || null,
      [`${FLOSUM_NAMESPACE}Start_Date__c`]: this.startDate,
      [`${FLOSUM_NAMESPACE}Organisation__c`]: this.targetOrgId,
      [`${FLOSUM_NAMESPACE}Tracking_Setting__c`]: this.trackingSettingId,
      [`${FLOSUM_NAMESPACE}Process_Type__c`]: PROCESS_TYPE_RETRIEVE_ORGANIZATION,
      [`${FLOSUM_NAMESPACE}Status__c`]: this._status,
      [`${FLOSUM_NAMESPACE}Succeed__c`]: this._status === LogStatus.COMPLETED,
      [`${FLOSUM_NAMESPACE}Completed_Date__c`]: this._status === LogStatus.IN_PROGRESS ? null : new Date().getTime(),
      [`${FLOSUM_NAMESPACE}Is_Error__c`]: this._status === LogStatus.EXCEPTION,
      [`${FLOSUM_NAMESPACE}Job_Completed__c`]: this._status !== LogStatus.IN_PROGRESS,
    };
  }

  public async init(): Promise<string> {
    this.createMetadataLog();

    const deployResult = await this.deployMetadataLog();
    const result = deployResult.at(0);
    if (result?.success) {
      this.metadataLogId = result.id;
      return result.id;
    } else {
      throw new Error(`Init metadata log error \n${result?.error}`);
    }
  }

  public async update(): Promise<void> {
    this.createMetadataLog();

    await this.deployMetadataLog().then((deployDataResult) => {
      const result = deployDataResult.at(0);
      if (result?.error) {
        throw new Error(`Update metadata log error \n${result?.error}`);
      }
    });
  }
}
