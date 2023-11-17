import {
  BaseBodyCreatorRollback,
  BaseBodyCreatorRollbackOptions,
} from '@/modules/veeva-vault/classes/rollback/body-creator/base.body-creator.rollback';
import { PackageDeploymentAction } from '@/modules/veeva-vault/enums/status.enums';
import { DeletedBodyCreatorRollback } from '@/modules/veeva-vault/classes/rollback/body-creator/deleted.body-creator.rollback';
import { DefaultBodyCreatorRollback } from '@/modules/veeva-vault/classes/rollback/body-creator/default.body-creator.rollback';

export type FactoryBodyCreatorRollbackOptions = BaseBodyCreatorRollbackOptions;

export class FactoryBodyCreatorRollback {
  public static create(options: FactoryBodyCreatorRollbackOptions): BaseBodyCreatorRollback {
    const { deploymentResult } = options;

    switch (deploymentResult.result) {
      case PackageDeploymentAction.CREATED:
        return new DeletedBodyCreatorRollback(options);
      case PackageDeploymentAction.DELETED:
      case PackageDeploymentAction.NO_CHANGE:
      case PackageDeploymentAction.UPDATED:
        return new DefaultBodyCreatorRollback(options);
      default:
        throw new Error(`Cannot create body for component with status ${deploymentResult.result}`);
    }
  }
}
