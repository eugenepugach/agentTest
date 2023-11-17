import { IMiddleware, Middleware } from '@/core';
import { Request, Response } from 'express';
import { MiddlewareScope } from '@/core/types/middleware-scope.type';
import { SalesforceService } from '@/modules/git/salesforce/services/salesforce.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { CredentialsFactory } from '@/modules/git/providers/credentials/credentials.factory';
import { ServicesFactory } from '@/modules/git/providers/api/git-api.factory';
import { ERR_UNKNOWN_GIT_SERVICE } from '@/constants/errors';

@Middleware(MiddlewareScope.Before)
export class GitConnectionMiddleware implements IMiddleware {
  constructor(private salesforceService: SalesforceService) {}
  public async handle(req: Request, _res: Response): Promise<void> {
    const connectionId = req.headers['x-connection-id'] || null;

    if (!connectionId || !req.context.container) {
      throw new Error(ERR_UNKNOWN_GIT_SERVICE);
    }

    const credentials = await this.salesforceService.fetchConnection(connectionId as string);

    if (!credentials) {
      throw new Error(ERR_UNKNOWN_GIT_SERVICE);
    }

    const connection = await CredentialsFactory.createFromConnection(credentials);
    const container = req.context.container;

    container.set(Tokens.provider, credentials.gitProvider);
    container.set(Tokens.credentials, connection);

    req.context.provider = ServicesFactory.createFromProvider(container, credentials.gitProvider);
  }
}
