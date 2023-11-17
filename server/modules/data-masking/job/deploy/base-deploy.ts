import { BaseDeployData } from '@flosum/salesforce';
import { AxiosInstance } from 'axios';
import { Writable } from 'stream';
import { DeployDataResult } from '@flosum/salesforce';
import { LoggerDetails } from '@data-masking-job/classes/logger/logger-details';
import { LoggerJobState } from '@data-masking-job/classes/logger/logger-job-state';
import { SALESFORCE_API_VERSION } from '@/modules/data-masking/constants';

export type BaseDeployOptions = {
  request: AxiosInstance;
  objectName: string;
  externalIdField: string;
  loggerDetails: LoggerDetails;
  loggerJobState: LoggerJobState;
};

export abstract class BaseDeploy extends Writable {
  protected readonly request: AxiosInstance;
  protected readonly objectName: string;
  protected readonly externalIdField: string;
  protected records: Record<string, any>[] = [];
  protected deployer: BaseDeployData;
  protected loggerDetails: LoggerDetails;
  protected loggerJobState: LoggerJobState;

  protected get baseDeployPayload() {
    return {
      objectName: this.objectName,
      instance: this.request,
      externalIdField: this.externalIdField,
      allOrNone: false,
      api: SALESFORCE_API_VERSION,
    };
  }

  constructor({ request, objectName, externalIdField, loggerDetails, loggerJobState }: BaseDeployOptions) {
    super({ objectMode: true });
    this.request = request;
    this.objectName = objectName;
    this.externalIdField = externalIdField;
    this.loggerDetails = loggerDetails;
    this.loggerJobState = loggerJobState;
  }

  public async _write(
    record: Record<string, any>,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    try {
      await this.push(record, _encoding, callback);
    } catch (error) {
      callback(error);
    }
  }

  public async _final(callback: (error?: Error | null) => void): Promise<void> {
    try {
      await this.finish(callback);
    } catch (error) {
      callback(error);
    }
  }

  protected abstract push(
    record: Record<string, any>,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): Promise<void>;

  protected abstract finish(callback: (error?: Error | null) => void): Promise<void>;

  protected async handleDeployResults(deployResults: DeployDataResult[]): Promise<void> {
    const errors = deployResults.filter((result) => result.error).map((result) => result.error as string);

    if (errors.length) {
      new Set(errors).forEach((error) => this.loggerDetails.exception(error, this.objectName));
    }

    const successRecordsNumber = deployResults.filter((record) => record.success).length;
    const failedRecordsNumber = deployResults.length - successRecordsNumber;
    this.loggerJobState.updateObjectProcess(this.objectName, successRecordsNumber, failedRecordsNumber);
  }
}
