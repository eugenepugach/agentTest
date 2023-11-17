import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { ObjectStatus } from '@data-masking-job/enums/logger.enums';
import { DescribeField } from '@flosum/salesforce';
import { StandardMasking, StandardMaskingOptions } from '@data-masking-job/masking/standard-masking';
import { ObjectMaskingRule } from '@data-masking-job/interfaces/job.interfaces';
import { BaseStep, BaseStepOptions } from '@data-masking-job/classes/step/base-step';

export type MaskingStepOptions = {
  objectRule: ObjectMaskingRule;
  libraries?: Record<string, string[] | number[]>;
} & BaseStepOptions;

export class MaskingStep extends BaseStep {
  protected readonly objectRule: ObjectMaskingRule;
  private readonly _libraries?: Record<string, string[] | number[]>;

  constructor({ libraries, ...options }: MaskingStepOptions) {
    super(options);

    this.objectRule = options.objectRule;
    this._libraries = libraries;
    this.fields = Object.keys(this.objectRule.fieldRules);
  }

  public async execute(): Promise<void> {
    this.log(`Masking object '${this.objectName}'`);
    this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.IN_PROGRESS);
    try {
      this.recordsCount = await this.getRecordsCount();

      if (this.recordsCount !== 0) {
        await pipeline(this.getRetrieveStream(), this.getMaskingStream(), this.getDeployStream());
      }

      this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.COMPLETED);
      this.log(`Finish masking for object '${this.objectName}'`);
    } catch (error) {
      this.error(error);
      this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.FAILED);
    }
  }

  protected getMaskingStream(): Transform {
    const describeFieldMap: Map<string, DescribeField> = this.objectDescribe.fields.reduce(
      (map: Map<string, DescribeField>, record: DescribeField) => map.set(record.name, record),
      new Map()
    );

    const maskingOptions: StandardMaskingOptions = {
      objectName: this.objectName,
      fieldRules: this.objectRule.fieldRules,
      describeFieldMap,
      libraries: this._libraries,
    };

    return new StandardMasking(maskingOptions);
  }
}
