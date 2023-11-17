import { NextFunction, Request, Response } from 'express';
import { Context } from '../classes/context.class';
import { Pipe } from '../classes/pipe.class';
import { META_HANDLER_ARGS, META_HANDLER_PARAMTYPES } from '../constants';
import { AnyType } from '../types/any.type';
import { HandlerArg, HandlerArgType } from '../types/handler-args.type';
import { HandlerFunction } from '../types/handler-function.type';

async function injectParam(handler: HandlerFunction, arg: HandlerArg, obj: Record<string, any>) {
  const types = Reflect.getMetadata(META_HANDLER_PARAMTYPES, handler);
  const name = arg.data?.name;
  const pipes: Pipe[] = arg.data?.pipes || [];

  let value = name ? obj[name] : obj;

  for (const pipe of pipes) {
    if (pipe.validatable) {
      await pipe.validate(value, types[arg.index]);
    }

    if (pipe.transformable) {
      value = await pipe.transform(value, types[arg.index]);
    }
  }

  return value;
}

async function injectCustomParam(arg: HandlerArg, ctx: Context) {
  return arg.value && arg.value(ctx, arg.data);
}

export async function handlerParamInjector(
  fn: HandlerFunction,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<AnyType[]> {
  const args: HandlerArg[] = Reflect.getOwnMetadata(META_HANDLER_ARGS, fn) || [];

  const injectedArgs: AnyType[] = [];

  for (const arg of args.sort((a, b) => a.index - b.index)) {
    switch (arg.type) {
      case HandlerArgType.Context:
        injectedArgs.push(req.context);
        break;
      case HandlerArgType.Request:
        injectedArgs.push(req);
        break;
      case HandlerArgType.Response:
        injectedArgs.push(res);
        break;
      case HandlerArgType.Next:
        injectedArgs.push(next);
        break;
      case HandlerArgType.Body:
        injectedArgs.push(await injectParam(fn, arg, req.body));
        break;
      case HandlerArgType.Path:
        injectedArgs.push(await injectParam(fn, arg, req.params));
        break;
      case HandlerArgType.Query:
        injectedArgs.push(await injectParam(fn, arg, req.query));
        break;
      case HandlerArgType.Custom:
        injectedArgs.push(await injectCustomParam(arg, req.context));
        break;
      default:
        continue;
    }
  }

  return injectedArgs;
}
