import { Constructable } from 'typedi';
import {
  META_HANDLER,
  META_HANDLER_METHOD,
  META_HANDLER_NESTED_CONTROLLER,
  META_HANDLER_PARAMTYPES,
  META_HANDLER_PATH,
  META_HANDLER_PROXY,
} from '../constants';
import { HandlerMethod } from '../types/handler-method.type';

export function handler(path = '', method: HandlerMethod): MethodDecorator {
  return (target: any, propertyKey, _descriptor) => {
    Reflect.defineMetadata(META_HANDLER, true, target[propertyKey]);
    Reflect.defineMetadata(META_HANDLER_METHOD, method, target[propertyKey]);
    Reflect.defineMetadata(META_HANDLER_PATH, path, target[propertyKey]);
    Reflect.defineMetadata(
      META_HANDLER_PARAMTYPES,
      Reflect.getMetadata('design:paramtypes', target, propertyKey),
      target[propertyKey]
    );
  };
}

export function ProxyHandler(): MethodDecorator {
  return (target: any, propertyKey, descriptor) => {
    Reflect.defineMetadata(META_HANDLER_PROXY, true, target[propertyKey]);
    handler(undefined, HandlerMethod.All)(target, propertyKey, descriptor);
  };
}

export function NestedController(path: string, controller: Constructable<any>): MethodDecorator {
  return (target: any, propertyKey, descriptor) => {
    Reflect.defineMetadata(META_HANDLER_NESTED_CONTROLLER, controller, target[propertyKey.toString()]);
    All(path)(target, propertyKey, descriptor);
  };
}

export function Get(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Get);
}

export function Post(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Post);
}

export function Patch(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Patch);
}

export function Put(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Put);
}

export function Delete(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Delete);
}

export function Options(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Options);
}

export function Head(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.Head);
}

export function All(path?: string): MethodDecorator {
  return handler(path, HandlerMethod.All);
}
