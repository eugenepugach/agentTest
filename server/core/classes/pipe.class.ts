import { ITransformPipe } from '../interfaces/transform-pipe.interface';
import { IValidationPipe } from '../interfaces/validation-pipe.interface';
import { AnyType } from '../types/any.type';
import { PipeOptions } from '../types/pipe-options.type';

export abstract class Pipe implements IValidationPipe, ITransformPipe {
  public static readonly DEFAULT_OPTIONS: PipeOptions = {
    transform: false,
    validate: true,
  };
  private _options: PipeOptions;

  constructor(options: PipeOptions = {}) {
    this._options = Object.assign(Pipe.DEFAULT_OPTIONS, options);
  }

  public get transformable(): boolean {
    return !!this._options.transform;
  }

  public get validatable(): boolean {
    return !!this._options.validate;
  }

  public transform<T>(_value: AnyType, _type: AnyType): T {
    throw new Error('Method not implemented.');
  }

  public validate(_value: AnyType, _type: AnyType): void {
    throw new Error('Method not implemented');
  }
}
