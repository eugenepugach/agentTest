import { Request, Response } from 'express';
import { Context } from '../classes/context.class';
import { Middleware } from '../decorators/middleware.decorator';
import { IMiddleware } from '../interfaces/middleware.interface';
import { MiddlewareScope } from '../types/middleware-scope.type';

@Middleware(MiddlewareScope.Before)
export class ContextMiddleware implements IMiddleware {
  public handle(req: Request, res: Response): void {
    req.context = new Context(req, res);
  }
}
