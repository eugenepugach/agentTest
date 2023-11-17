import { Service } from 'typedi';
import { META_CONTROLLER_PATH, META_CONTROLLER } from '../constants';

export function Controller(path?: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any) => {
    Reflect.defineMetadata(META_CONTROLLER_PATH, path, target);
    Reflect.defineMetadata(META_CONTROLLER, true, target);
    Service()(target);
  };
}
