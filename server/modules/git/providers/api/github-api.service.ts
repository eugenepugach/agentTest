import { Inject, Service } from 'typedi';
import { GitApiService } from './git-api.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';
import { GithubServerCredentialsDto } from '@/modules/git/providers/credentials/dto/github-server-credentials.dto';

@Service()
export class GithubApiService extends GitApiService<GithubCredentialsDto | GithubServerCredentialsDto> {
  protected MAX_REQUEST_PER_HOUR = this.provider === GitProvider.GithubServer ? 15000 : 5000;

  constructor(
    @Inject(Tokens.provider) provider: GitProvider,
    @Inject(Tokens.credentials) credentials: GithubCredentialsDto | GithubServerCredentialsDto
  ) {
    super(provider, credentials);
  }

  public getHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github.v3+json',
      Authorization: this.credentials.getAuthorizationHeader(),
    };
  }

  public getCurrentUser(): Promise<any> {
    return this.request.get('user');
  }

  public async isLoggedIn(): Promise<boolean> {
    await this.getCurrentUser();
    return true;
  }
}
