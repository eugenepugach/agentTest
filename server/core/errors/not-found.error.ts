import { AnyType } from '../types/any.type';
import { ApiError } from './api.error';

export class NotFoundError extends ApiError {
  constructor(error: AnyType) {
    super(error, 404);
  }
}
