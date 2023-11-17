import { RequestHandler } from 'express';
import Container, { Constructable } from 'typedi';
import { META_MIDDLEWARE, META_MIDDLEWARE_SCOPE } from '../constants';
import { MiddlewareScope } from '../types/middleware-scope.type';
import { middlewareWrapper } from '../wrappers/middleware.wrapper';

export function middlewareInjector(middlewareType: Constructable<any>): RequestHandler {
  if (!Reflect.getOwnMetadata(META_MIDDLEWARE, middlewareType)) {
    throw TypeError(`${middlewareType.name} is not a middleware`);
  }

  const middleware = Container.get(middlewareType);
  const middlewareScope = Reflect.getOwnMetadata(META_MIDDLEWARE_SCOPE, middlewareType);

  if (middlewareScope === MiddlewareScope.Error) {
    if ('handleError' in middleware && typeof middleware.handleError === 'function') {
      return middlewareWrapper(middleware.handleError.bind(middleware), true);
    } else {
      throw new TypeError(`${middlewareType.name} should has a Error scope to handle errors`);
    }
  }

  return middlewareWrapper(middleware.handle.bind(middleware));
}
