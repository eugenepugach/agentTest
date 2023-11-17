import { ResponseResult } from '../types/response-result.type';
import { isEmptyObject } from '../utils';

export class ApiError extends Error {
  private original: any;
  public statusCode: number;

  constructor(error: any | string, statusCode?: number) {
    error = typeof error === 'string' ? new Error(error) : error;

    super(error.message);

    if (error instanceof ApiError) {
      this.statusCode = error.statusCode;
      this.name = error.name;
      this.original = error.original;
    } else {
      this.original = error;

      if (statusCode) {
        this.statusCode = statusCode;
      }
    }
  }

  public toJSON(): Record<string, any> {
    return {
      status: ResponseResult.Error,
      statusCode: this.statusCode,
      message: this.message,
      original: isEmptyObject(this.original) ? undefined : this.original,
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
