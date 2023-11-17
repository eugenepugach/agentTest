import { Inject, Service } from 'typedi';
import { GitApiService } from './git-api.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';
import { GithubServerCredentialsDto } from '@/modules/git/providers/credentials/dto/github-server-credentials.dto';
import { ERR_INVALID_PROVIDER_CREDENTIALS } from '@/modules/git/providers/providers.errors';

@Service()
export class AzureApiService extends GitApiService<GithubCredentialsDto | GithubServerCredentialsDto> {
  protected MAX_REQUEST_PER_HOUR = 10000;

  constructor(
    @Inject(Tokens.provider) provider: GitProvider,
    @Inject(Tokens.credentials) credentials: GithubCredentialsDto | GithubServerCredentialsDto
  ) {
    super(provider, credentials);
  }

  public getHeaders(): Record<string, string> {
    return {
      Accept: 'application/json; api-version=5.0',
      Authorization: this.credentials.getAuthorizationHeader(),
    };
  }

  public async isLoggedIn(): Promise<boolean> {
    await this.request.get(`${this.credentials.organization}/_apis/git/repositories`).then((result: any) => {
      if (typeof result === 'string') {
        throw new Error(ERR_INVALID_PROVIDER_CREDENTIALS);
      }
    });

    return true;
  }
}
