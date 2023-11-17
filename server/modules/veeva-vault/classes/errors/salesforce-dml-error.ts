import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { SalesforceDmlErrorDetails } from '@/modules/veeva-vault/interfaces/errors.interfaces';

export class SalesforceDmlError extends BaseVeevaError<SalesforceDmlErrorDetails> {
  constructor(errors: SalesforceDmlErrorDetails[]) {
    super('Salesforce DML Error', errors);
  }

  public getMessages(): string[] {
    return this.errors.map((item) => {
      let errorMessage = `${item.statusCode}: ${item.message}.`;
      if (item.fields?.length) {
        errorMessage += item.fields.join(',');
      }
      return errorMessage;
    });
  }
}
