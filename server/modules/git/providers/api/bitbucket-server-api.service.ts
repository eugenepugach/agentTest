import { Inject, Service } from 'typedi';
import { GitApiService } from './git-api.service';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

@Service()
export class BitbucketServerApiService extends GitApiService<BitbucketServerCredentialsDto> {
  protected MAX_REQUEST_PER_HOUR = 10000;

  constructor(
    @Inject(Tokens.provider) provider: GitProvider,
    @Inject(Tokens.credentials) credentials: BitbucketServerCredentialsDto
  ) {
    super(provider, credentials);
  }

  protected getHeaders(): Record<string, any> {
    return {
      Authorization: this.credentials.getAuthorizationHeader(),
    };
  }

  public getUsers(): Promise<any> {
    return this.request.get('users');
  }

  public async isLoggedIn(): Promise<boolean> {
    await this.getUsers();

    return true;
  }
}
