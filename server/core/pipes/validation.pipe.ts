import { UnprocessableEntityError } from '@/core/errors/unprocessable-entity.error';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Constructable } from 'typedi';
import { Pipe } from '@/core';
import { AnyType } from '../types/any.type';

/**
 * Standard validation pipe to ensure that dto's a valid
 */
export class ValidationPipe extends Pipe {
  public transform<T = unknown>(value: AnyType, type: Constructable<T>): T {
    const instance = plainToInstance(type, value, { excludeExtraneousValues: true });

    if (!instance) {
      throw new UnprocessableEntityError(`${value} is not valid type of ${type.name || type.toString()}`);
    }

    return instance;
  }

  public async validate(value: AnyType, type: Constructable<any>): Promise<void> {
    if ('constructor' in type) {
      const instance = plainToInstance(type, value);

      if (!instance) {
        throw new UnprocessableEntityError(`${value} is not valid type of ${type.name || type.toString()}`);
      }

      const errors = await validate(instance, {
        stopAtFirstError: false,
        forbidUnknownValues: false,
      });

      if (errors.length) {
        throw new UnprocessableEntityError(errors);
      }
    } else {
      throw new TypeError(`Invalid validation type. Supports only classes!`);
    }
  }
}
