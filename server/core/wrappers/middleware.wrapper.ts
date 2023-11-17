import { NextFunction } from 'express';
import { HandlerFunction } from '../types/handler-function.type';

async function asyncWrapper(handler: () => HandlerFunction, next: NextFunction): Promise<void> {
  try {
    await handler();
    next();
  } catch (error) {
    next(error);
  }
}

export function middlewareWrapper(handler: HandlerFunction, isErrorHandler = false): HandlerFunction {
  if (isErrorHandler) {
    return (error, req, res, next) => asyncWrapper(() => handler(error, req, res), next);
  }

  return (req, res, next) => asyncWrapper(() => handler(req, res), next);
}
