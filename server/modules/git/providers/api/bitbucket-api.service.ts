import axios, { AxiosInstance } from 'axios';
import { Inject, Service } from 'typedi';
import { GitApiService } from './git-api.service';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { URL } from 'url';

@Service()
export class BitbucketApiService extends GitApiService<BitbucketCredentialsDto> {
  private accessTokenExpiresAt = -1;

  protected MAX_REQUEST_PER_HOUR = 1000;

  constructor(
    @Inject(Tokens.provider) provider: GitProvider,
    @Inject(Tokens.credentials) credentials: BitbucketCredentialsDto
  ) {
    super(provider, credentials);
  }

  public createRequest(baseURL?: string): AxiosInstance {
    const request = super.createRequest(baseURL);

    request.interceptors.request.use(async (config) => {
      await this.checkAccessToken();

      config.headers.Authorization = this.credentials.getAuthorizationHeader();

      return config;
    });

    return request;
  }

  private async checkAccessToken(): Promise<void> {
    if (Date.now() < this.accessTokenExpiresAt) {
      return;
    }

    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    const { clientId, clientSecret } = this.credentials;

    const url = new URL('https://bitbucket.org');
    url.username = clientId;
    url.password = clientSecret;
    url.pathname = '/site/oauth2/access_token';

    const { data } = await axios.post(url.toString(), `grant_type=client_credentials`);

    const { expires_in, access_token } = data;

    this.accessTokenExpiresAt = Date.now() + expires_in * 1000;
    this.credentials.setAccessToken(access_token);
  }

  protected getHeaders(): Record<string, any> {
    return {};
  }

  public getCurrentUser(): Promise<any> {
    return this.request.get('user');
  }

  public async isLoggedIn(): Promise<boolean> {
    await this.getCurrentUser();

    return true;
  }
}
