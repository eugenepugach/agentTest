import { BaseBodyCreatorRollback } from '@/modules/veeva-vault/classes/rollback/body-creator/base.body-creator.rollback';

export class DeletedBodyCreatorRollback extends BaseBodyCreatorRollback {
  public async create(): Promise<string> {
    const { name, type } = this.deploymentResult;
    return `DROP ${type} ${name};`;
  }
}
