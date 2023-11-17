import { DescribeObject, DescribeService } from '@flosum/salesforce';
import { ObjectDeleteRule, ObjectMaskingRule, ObjectRule } from '@data-masking-job/interfaces/job.interfaces';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { MaskingStep } from '@data-masking-job/classes/step/masking-step';
import { SALESFORCE_API_VERSION_RAW } from '@/constants';
import { LoggerDetails } from '@data-masking-job/classes/logger/logger-details';
import { LoggerJobState } from '@data-masking-job/classes/logger/logger-job-state';
import { ObjectRuleType } from '@data-masking-job/enums/job.enums';
import { DeleteStep } from '@data-masking-job/classes/step/delete-step';
import { BaseStep } from '@data-masking-job/classes/step/base-step';

export type StepsCreatorOptions = {
  loggerDetails: LoggerDetails;
  loggerJobState: LoggerJobState;
  libraries?: Record<string, string[] | number[]>;
  objectRules: Record<string, ObjectRule>;
  request: AxiosInstance;
};

export class StepsCreator {
  private readonly _loggerDetails: LoggerDetails;
  private readonly _loggerJobState: LoggerJobState;
  private readonly _libraries?: Record<string, string[] | number[]>;
  private readonly _objectRules: Record<string, ObjectRule>;
  private readonly _request: AxiosInstance;
  private _objectsDescribes: Record<string, DescribeObject>;

  constructor({ loggerDetails, loggerJobState, objectRules, request, libraries }: StepsCreatorOptions) {
    this._loggerDetails = loggerDetails;
    this._loggerJobState = loggerJobState;
    this._objectRules = objectRules;
    this._request = request;
    this._libraries = libraries;
  }

  public async create(): Promise<BaseStep[]> {
    this._objectsDescribes = await this.fetchDescribes();

    return Object.keys(this._objectRules).map((objectName) => {
      const { type } = this._objectRules[objectName];

      switch (type) {
        case ObjectRuleType.MASKING:
          return this.getMaskingStep(objectName);
        case ObjectRuleType.DELETE:
          return this.getDeleteStep(objectName);
        default:
          throw new Error(`Unknown type '${type}' for ObjectRule '${objectName}'`);
      }
    });
  }

  private async fetchDescribes(): Promise<Record<string, DescribeObject>> {
    const objectDescribes = await DescribeService.objects(
      this._request,
      {} as AxiosRequestConfig,
      Object.keys(this._objectRules),
      SALESFORCE_API_VERSION_RAW
    );

    return objectDescribes.reduce((result, objectDescribe) => {
      return { [objectDescribe.name]: objectDescribe, ...result };
    }, {} as Record<string, DescribeObject>);
  }

  private getMaskingStep(objectName: string): MaskingStep {
    return new MaskingStep({
      loggerDetails: this._loggerDetails,
      loggerJobState: this._loggerJobState,
      objectName,
      request: this._request,
      objectRule: this._objectRules[objectName] as ObjectMaskingRule,
      objectDescribe: this._objectsDescribes[objectName],
      libraries: this._libraries,
    });
  }

  private getDeleteStep(objectName: string): DeleteStep {
    return new DeleteStep({
      loggerDetails: this._loggerDetails,
      loggerJobState: this._loggerJobState,
      objectName,
      request: this._request,
      objectRule: this._objectRules[objectName] as ObjectDeleteRule,
      objectDescribe: this._objectsDescribes[objectName],
    });
  }
}
