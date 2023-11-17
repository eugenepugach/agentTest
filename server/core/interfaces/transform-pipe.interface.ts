import { AnyType } from '../types/any.type';

export interface ITransformPipe {
  transform<T>(value: AnyType, type: AnyType): T;
}
