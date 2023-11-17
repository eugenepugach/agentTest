import { classToPlain } from 'class-transformer';
import { Request, Response } from 'express';
import { Middleware } from '../decorators/middleware.decorator';
import { IMiddleware } from '../interfaces/middleware.interface';
import { MiddlewareScope } from '../types/middleware-scope.type';
import { statusCodeFromMethod } from '../utils';

@Middleware(MiddlewareScope.After)
export class ResponseMiddleware implements IMiddleware {
  public handle(req: Request, res: Response): void {
    const { context } = req;

    res.status(context.statusCode || statusCodeFromMethod(req.method));
    res.json((context.data && classToPlain(context.data)) || {});
    res.end();
  }
}
