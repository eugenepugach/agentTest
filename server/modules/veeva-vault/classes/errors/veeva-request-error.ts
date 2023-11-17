import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { AnyType } from '@/core/types/any.type';

export class VeevaRequestError extends BaseVeevaError<AnyType> {
  constructor(error: AnyType) {
    const errors = Array.isArray(error) ? error : [error];
    super('Request Error', errors);
  }

  public getMessages(): string[] {
    return this.errors.map((item) => JSON.stringify(item));
  }
}
