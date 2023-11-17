/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Pipe } from '../classes/pipe.class';
import { META_HANDLER_ARGS } from '../constants';
import { HandlerArgType, HandlerArg, HandlerArgValue } from '../types/handler-args.type';

export function paramDecoratorWrapper(type: HandlerArgType, data?: any, value?: HandlerArgValue): ParameterDecorator {
  return (target: any, propertyKey: string | symbol, index: number): void => {
    const args: HandlerArg[] = Reflect.getOwnMetadata(META_HANDLER_ARGS, target[propertyKey]) || [];
    args.push({
      index,
      type,
      data,
      value,
    });
    Reflect.defineMetadata(META_HANDLER_ARGS, args, target[propertyKey]);
  };
}

function context(): ParameterDecorator {
  return paramDecoratorWrapper(HandlerArgType.Context, null);
}

function buildParam(type: HandlerArgType, name: string | Pipe, ...pipes: Pipe[]) {
  if (name && typeof name !== 'string') {
    pipes ||= [];
    pipes.unshift(name);
    name = undefined as any;
  }

  return paramDecoratorWrapper(type, {
    name,
    pipes,
  });
}

function body(...pipes: Pipe[]): ParameterDecorator;
function body(name: string, ...pipes: Pipe[]): ParameterDecorator;
function body(name: string | Pipe, ...pipes: Pipe[]): ParameterDecorator {
  return buildParam(HandlerArgType.Body, name, ...pipes);
}

function path(...pipes: Pipe[]): ParameterDecorator;
function path(name: string, ...pipes: Pipe[]): ParameterDecorator;
function path(name: string | Pipe, ...pipes: Pipe[]): ParameterDecorator {
  return buildParam(HandlerArgType.Path, name, ...pipes);
}

function query(...pipes: Pipe[]): ParameterDecorator;
function query(name: string, ...pipes: Pipe[]): ParameterDecorator;
function query(name: string | Pipe, ...pipes: Pipe[]): ParameterDecorator {
  return buildParam(HandlerArgType.Query, name, ...pipes);
}

function request(): ParameterDecorator {
  return paramDecoratorWrapper(HandlerArgType.Request);
}

function response(): ParameterDecorator {
  return paramDecoratorWrapper(HandlerArgType.Response);
}

function next(): ParameterDecorator {
  return paramDecoratorWrapper(HandlerArgType.Next);
}

export const param = {
  context,
  body,
  path,
  query,
  request,
  response,
  next,
};
