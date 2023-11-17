import { Writable } from 'stream';
import { BaseDeployOptions } from '@data-masking-job/deploy/base-deploy';
import { BulkV1Deploy } from '@data-masking-job/deploy/bulk-v1-deploy';
import { ObjectRuleType } from '@data-masking-job/enums/job.enums';
import { BulkV1DeleteDeploy } from '@data-masking-job/deploy/bulk-v1-delete-deploy';

export class DeployFactory {
  public static create(deployOptions: BaseDeployOptions, objectRuleType: ObjectRuleType): Writable {
    switch (objectRuleType) {
      case ObjectRuleType.MASKING:
        return new BulkV1Deploy(deployOptions);
      case ObjectRuleType.DELETE:
        return new BulkV1DeleteDeploy(deployOptions);
    }
  }
}
