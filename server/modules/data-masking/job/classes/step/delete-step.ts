import { BaseStep, BaseStepOptions } from '@data-masking-job/classes/step/base-step';
import { ObjectStatus } from '@data-masking-job/enums/logger.enums';
import { pipeline } from 'stream/promises';
import { ObjectDeleteRule } from '@data-masking-job/interfaces/job.interfaces';

export type DeleteStepOptions = {
  objectRule: ObjectDeleteRule;
} & BaseStepOptions;

export class DeleteStep extends BaseStep {
  constructor(options: DeleteStepOptions) {
    super(options);
  }

  public async execute(): Promise<void> {
    this.log(`Deleting records for object '${this.objectName}'`);
    this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.IN_PROGRESS);
    try {
      this.recordsCount = await this.getRecordsCount();

      if (this.recordsCount !== 0) {
        await pipeline(this.getRetrieveStream(), this.getDeployStream());
      }

      this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.COMPLETED);
      this.log(`Finish deleting records for object '${this.objectName}'`);
    } catch (error) {
      this.error(error);
      this.loggerJobState.setObjectStatus(this.objectName, ObjectStatus.FAILED);
    }
  }
}
