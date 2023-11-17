import { AnyType } from '../types/any.type';

export interface IValidationPipe {
  validate(value: AnyType, type: AnyType): void;
}
