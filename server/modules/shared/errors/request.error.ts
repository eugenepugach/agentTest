import { AnyType } from '@/core/types/any.type';

export class RequestError extends Error {
  constructor(public message: string, public errorResponse: AnyType) {
    super(message);
  }
}
