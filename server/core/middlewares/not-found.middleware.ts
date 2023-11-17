import { Request, Response } from 'express';
import { Middleware } from '../decorators/middleware.decorator';
import { NotFoundError } from '../errors/not-found.error';
import { IMiddleware } from '../interfaces/middleware.interface';
import { MiddlewareScope } from '../types/middleware-scope.type';

@Middleware(MiddlewareScope.After)
export class NotFoundMiddleware implements IMiddleware {
  public handle(req: Request, _res: Response): void {
    if (!req.context.handled) {
      throw new NotFoundError(`[${req.method}] Endpoint ${req.path} not found`);
    }
  }
}
