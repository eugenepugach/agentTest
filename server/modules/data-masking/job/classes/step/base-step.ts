import { LoggerDetails } from '@data-masking-job/classes/logger/logger-details';
import { LoggerJobState } from '@data-masking-job/classes/logger/logger-job-state';
import { AxiosInstance } from 'axios';
import { DescribeObject, QueryBuilder, QueryService } from '@flosum/salesforce';
import { Readable, Writable } from 'stream';
import { RetrieveFactory, RetrieveOptions } from '@data-masking-job/retrieve/retrieve-factory';
import { SALESFORCE_API_VERSION } from '@/modules/data-masking/constants';
import { DeployFactory } from '@data-masking-job/deploy/deploy-factory';
import { systemLogger } from '@data-masking-job/job-detail';
import { ObjectRule } from '@data-masking-job/interfaces/job.interfaces';
import { ObjectRuleType } from '@data-masking-job/enums/job.enums';
import { BaseDeployOptions } from '@data-masking-job/deploy/base-deploy';

const FIELD_ID = 'Id';

export type BaseStepOptions = {
  objectName: string;
  loggerDetails: LoggerDetails;
  loggerJobState: LoggerJobState;
  request: AxiosInstance;
  objectRule: ObjectRule;
  objectDescribe: DescribeObject;
};

export abstract class BaseStep {
  protected readonly loggerDetails: LoggerDetails;
  protected readonly loggerJobState: LoggerJobState;
  protected readonly objectName: string;
  protected readonly request: AxiosInstance;
  protected readonly objectDescribe: DescribeObject;
  private readonly _whereClause?: string;
  private readonly _objectRuleType: ObjectRuleType;
  protected fields: string[] = [];
  protected recordsCount: number;

  constructor({ loggerDetails, loggerJobState, objectName, request, objectRule, objectDescribe }: BaseStepOptions) {
    this.loggerDetails = loggerDetails;
    this.loggerJobState = loggerJobState;
    this.objectName = objectName;
    this.request = request;
    this._whereClause = objectRule.whereClause;
    this._objectRuleType = objectRule.type;
    this.objectDescribe = objectDescribe;
  }

  public abstract execute(): Promise<void>;

  protected async getRecordsCount(): Promise<number> {
    try {
      const queryBuilder = new QueryBuilder().select(`COUNT()`).from(this.objectName);

      if (this._whereClause) {
        queryBuilder.where(this._whereClause);
      }

      const queryResult = await QueryService.execute(
        this.request,
        {},
        queryBuilder.build(),
        false,
        SALESFORCE_API_VERSION
      );

      return queryResult.totalSize;
    } catch (error) {
      systemLogger.error(error);
      return -1;
    }
  }

  protected getRetrieveStream(): Readable {
    const retrieveOptions: RetrieveOptions = {
      request: this.request,
      fields: this.fields,
      whereClause: this._whereClause,
      objectName: this.objectName,
      describe: this.objectDescribe,
    };

    return RetrieveFactory.create(retrieveOptions, this.recordsCount);
  }

  protected getDeployStream(): Writable {
    const deployOptions: BaseDeployOptions = {
      request: this.request,
      objectName: this.objectName,
      externalIdField: FIELD_ID,
      loggerDetails: this.loggerDetails,
      loggerJobState: this.loggerJobState,
    };

    return DeployFactory.create(deployOptions, this._objectRuleType);
  }

  protected log(message: string): void {
    systemLogger.log(message, this.objectName);
    this.loggerDetails.log(message, this.objectName);
  }

  protected error(error: Error): void {
    systemLogger.error(error, this.objectName);
    this.loggerDetails.exception(error.message, this.objectName);
  }
}
