import { Constructable } from 'typedi';
import { META_CONTROLLER_MIDDLEWARES } from '../constants';

export function UseMiddlewares(...middlewares: Constructable<any>[]): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any) => {
    Reflect.defineMetadata(META_CONTROLLER_MIDDLEWARES, middlewares, target);
  };
}
