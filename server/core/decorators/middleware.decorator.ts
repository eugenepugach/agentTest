import { Service } from 'typedi';
import { META_MIDDLEWARE, META_MIDDLEWARE_SCOPE } from '../constants';
import { MiddlewareScope } from '../types/middleware-scope.type';

export function Middleware(scope: MiddlewareScope = MiddlewareScope.Before): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(META_MIDDLEWARE, true, target);
    Reflect.defineMetadata(META_MIDDLEWARE_SCOPE, scope, target);
    Service({ transient: true })(target);
  };
}
