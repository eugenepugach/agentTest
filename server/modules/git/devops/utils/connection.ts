import { Container, Service } from 'typedi';
import { ERR_UNKNOWN_GIT_SERVICE } from '@/constants/errors';
import { CredentialsFactory } from '@/modules/git/providers/credentials/credentials.factory';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { ServicesFactory } from '@/modules/git/providers/api/git-api.factory';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { SalesforceService } from '@/modules/git/salesforce/services/salesforce.service';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';

@Service()
export class ProvidersFactory {
  constructor(private salesforceService: SalesforceService) {}

  public async createFromConnection(connectionId: string): Promise<GitApiService<any>> {
    const credentials = await this.salesforceService.fetchConnection(connectionId as string);

    if (!credentials) {
      throw new Error(ERR_UNKNOWN_GIT_SERVICE);
    }

    Container.set(Tokens.config, credentials);

    const connection = await CredentialsFactory.createFromConnection(credentials);

    Container.set(Tokens.provider, credentials.gitProvider);
    Container.set(Tokens.credentials, connection);

    const gitApiService = await ServicesFactory.createFromProvider(Container, credentials.gitProvider);

    if (!(await gitApiService.isLoggedIn())) {
      throw new BadRequestError(ERR_UNKNOWN_GIT_SERVICE);
    }

    return gitApiService;
  }
}
