import { BaseBodyCreatorRollback } from '@/modules/veeva-vault/classes/rollback/body-creator/base.body-creator.rollback';

export class DefaultBodyCreatorRollback extends BaseBodyCreatorRollback {
  public async create(): Promise<string> {
    const decodeBody = await this.backupZip.file(this.fileName)?.async('string');

    if (!decodeBody) {
      throw new Error('Cannot find component in backup.');
    }

    return decodeBody;
  }
}
