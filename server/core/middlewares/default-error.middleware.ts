import { Request, Response } from 'express';
import { Logger } from '..';
import { Middleware } from '../decorators/middleware.decorator';
import { ApiError } from '../errors/api.error';
import { InternalServerError } from '../errors/internal-server.error';
import { IErrorMiddleware } from '../interfaces/error-middleware.interface';
import { MiddlewareScope } from '../types/middleware-scope.type';

@Middleware(MiddlewareScope.Error)
export class DefaultErrorMiddleware implements IErrorMiddleware {
  private readonly logger = new Logger(DefaultErrorMiddleware.name);

  public handleError(error: ApiError, _req: Request, res: Response): void {
    if (!(error instanceof ApiError)) {
      error = new InternalServerError(error);
    }

    this.logger.log(error.toJSON());

    res.status(error.statusCode).send(error.toJSON());
  }
}
