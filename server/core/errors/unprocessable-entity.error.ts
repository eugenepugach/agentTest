import { ValidationError } from 'class-validator';
import { getErrorsFromValidationErrors } from '../utils';
import { ApiError } from './api.error';

export class UnprocessableEntityError extends ApiError {
  constructor(private errors?: ValidationError[] | string) {
    super(typeof errors === 'string' ? errors : 'Validation error', 422);
  }

  public toJSON(): any {
    return {
      ...super.toJSON(),
      errors: this.errors && Array.isArray(this.errors) && getErrorsFromValidationErrors(this.errors),
    };
  }
}
