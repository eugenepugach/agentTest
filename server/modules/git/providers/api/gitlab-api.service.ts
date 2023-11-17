import { Inject, Service } from 'typedi';
import { GitApiService } from './git-api.service';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';
import { GitlabServerCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-server-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

@Service()
export class GitlabApiService extends GitApiService<GitlabCredentialsDto | GitlabServerCredentialsDto> {
  protected MAX_REQUEST_PER_HOUR = 3600;

  constructor(
    @Inject(Tokens.provider) provider: GitProvider,
    @Inject(Tokens.credentials) credentials: GitlabCredentialsDto | GitlabServerCredentialsDto
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

  public getGroup(id: string): Promise<any> {
    return this.request.get(`groups/${id}`);
  }

  public async isLoggedIn(): Promise<boolean> {
    await this.getCurrentUser();

    return true;
  }
}
