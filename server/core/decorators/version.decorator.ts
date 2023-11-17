import { META_CONTROLLER_VERSION } from '../constants';

export function Version(version: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any) => {
    Reflect.defineMetadata(META_CONTROLLER_VERSION, version, target);
  };
}
