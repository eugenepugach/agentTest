import { META_CONTROLLER_PREFIX } from '../constants';

export function Prefix(prefix?: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any) => {
    Reflect.defineMetadata(META_CONTROLLER_PREFIX, prefix, target);
  };
}
