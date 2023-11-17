import { ERR_UNKNOWN } from '@/constants/errors';
import { ValidationError } from 'class-validator';
import { IRouterMatcher, Router } from 'express';
import { Constructable } from 'typedi';
import {
  META_HANDLER,
  META_CONTROLLER_MIDDLEWARES,
  META_HANDLER_NESTED_CONTROLLER,
  META_HANDLER_METHOD,
  META_HANDLER_PATH,
} from '../constants';
import { AnyType } from '../types/any.type';
import { HandlerFunction } from '../types/handler-function.type';
import { HandlerMeta } from '../types/handler-meta.type';
import { HandlerMethod } from '../types/handler-method.type';

export function isEmptyObject(obj: AnyType): boolean {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
}

export function getControllerHandlers<T>(controller: T): HandlerFunction[] {
  const prototype = Object.getPrototypeOf(controller);
  const handlers = Object.getOwnPropertyNames(prototype)
    .map((methodName) => prototype[methodName])
    .filter((method) => !!Reflect.getOwnMetadata(META_HANDLER, method));

  return handlers;
}

export function getControllerMiddlewares(controller: Constructable<any>): Constructable<any>[] {
  return Reflect.getOwnMetadata(META_CONTROLLER_MIDDLEWARES, controller) || [];
}

export function getHandleByMethod(router: Router, method: HandlerMethod): IRouterMatcher<Router> {
  switch (method) {
    case HandlerMethod.Get:
      return router.get;
    case HandlerMethod.Post:
      return router.post;
    case HandlerMethod.Patch:
      return router.patch;
    case HandlerMethod.Put:
      return router.put;
    case HandlerMethod.Options:
      return router.options;
    case HandlerMethod.Head:
      return router.head;
    case HandlerMethod.All:
      return router.all;
    case HandlerMethod.Delete:
      return router.delete;
    default:
      throw new TypeError(ERR_UNKNOWN);
  }
}

export function statusCodeFromMethod(method: string): number {
  switch (method) {
    case 'GET':
      return 200;
    case 'POST':
      return 201;
    case 'DELETE':
      return 204;
    case 'PATCH':
      return 200;
    default:
      return 204;
  }
}

export function normalizePaths(...paths: string[]): string {
  return (
    '/' +
    paths
      .join('/')
      .split('/')
      .filter((path) => !!path)
      .join('/')
  );
}

export function getHandlerMeta(handler: HandlerFunction): HandlerMeta {
  const path = Reflect.getMetadata(META_HANDLER_PATH, handler);
  const method = Reflect.getMetadata(META_HANDLER_METHOD, handler);
  const nested = Reflect.getMetadata(META_HANDLER_NESTED_CONTROLLER, handler);

  return {
    nested,
    path: normalizePaths(path),
    method,
  };
}

export function getErrorsFromValidationErrors(errors: ValidationError | ValidationError[]): string[] {
  if (!Array.isArray(errors)) {
    errors = [errors];
  }

  const errorsList = [];

  for (const error of errors) {
    const constraints = error.constraints || {};

    if (error.children && error.children.length) {
      errorsList.push(...getErrorsFromValidationErrors(error.children));
    } else {
      const propertyErrors = Object.keys(constraints).map((key) => constraints[key]);
      errorsList.push(...propertyErrors);
    }
  }

  return errorsList;
}
