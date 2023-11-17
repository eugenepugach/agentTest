import { Request, Response, NextFunction } from 'express';
import { handlerParamInjector } from '../injectors/handler-param.injector';
import { AnyType } from '../types/any.type';

export function handlerWrapper(handler: (...args: any[]) => any, handlerThis: AnyType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let nextCalled = false;

      const args = await handlerParamInjector(handler, req, res, (error?: any) => {
        nextCalled = true;
        next(error);
      });

      const data = await handler.call(handlerThis, ...args);

      if (!nextCalled && !req.context.requestEnded) {
        req.context.handle();
        req.context.data = data;
        next();
      }
    } catch (error) {
      next(error);
    }
  };
}
