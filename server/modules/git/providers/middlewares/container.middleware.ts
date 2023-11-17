import { IMiddleware, Middleware } from '@/core';
import { Request, Response } from 'express';
import Container from 'typedi';
import { randomUUID } from 'crypto';
import { MiddlewareScope } from '@/core/types/middleware-scope.type';

@Middleware(MiddlewareScope.Before)
export class ContainerMiddlewareBefore implements IMiddleware {
  public async handle(req: Request, _res: Response): Promise<void> {
    req.context.container = Container.of(randomUUID());
  }
}

@Middleware(MiddlewareScope.After)
export class ContainerMiddlewareAfter implements IMiddleware {
  public async handle(req: Request, _res: Response): Promise<void> {
    req.context.container?.reset();
  }
}
