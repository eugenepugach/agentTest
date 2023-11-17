import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { VeevaErrorDetails } from '@/modules/veeva-vault/interfaces/errors.interfaces';

export class VeevaError extends BaseVeevaError<VeevaErrorDetails> {
  constructor(errors: VeevaErrorDetails[]) {
    super('Veeva Error', errors);
  }

  public getMessages(): string[] {
    return this.errors.map((item) => `${item.type}: ${item.message}`);
  }
}
