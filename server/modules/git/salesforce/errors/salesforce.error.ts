import { ERR_UNKNOWN } from '@/constants/errors';
import { AnyType } from '@/core/types/any.type';
import { RequestError } from '@/modules/shared/errors/request.error';

export class SalesforceError extends Error {
  public response: Record<string, any>;
  public original: Error;

  constructor(error?: AnyType) {
    super(error.message || error || ERR_UNKNOWN);

    if (error instanceof RequestError) {
      this.response = error.errorResponse;
    }

    this.original = error;
  }

  public toJSON(): Record<string, any> {
    return {
      message: this.message,
      original: this.original,
      response: this.response,
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
