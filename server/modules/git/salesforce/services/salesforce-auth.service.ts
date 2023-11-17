import Container, { Service } from 'typedi';
import { ERR_INVALID_SALESFORCE_TOKEN } from '@/constants/errors';
import { Logger } from '@/core';
import axios, { AxiosRequestConfig } from 'axios';
import { joinURL, sleep } from '../../../shared/utils';
import { InvalidRefreshTokenError } from '../errors/invalid-refresh-token.error';
import { AuthState } from '../enums/auth-state.enum';
import { UnauthorizedSalesforceError } from '../errors/unauthorized-salesforce.error';
import { SALESFORCE_API_VERSION } from '@/constants';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Service()
export class SalesforceAuthService {
  private readonly AUTH_WAIT_TIME = 5000;
  private authState: AuthState = AuthState.Idle;
  private instanceUrl: string;
  private orgId: string;
  private accessToken: string;
  private tokenType: string;
  private logger = new Logger(SalesforceAuthService.name);

  constructor() {
    this.setAuthDetails();
  }

  private async setAuthDetails(): Promise<void> {
    this.logger.log('check auth: current state - %s', AuthState[this.authState]);
    try {
      if (this.authState === AuthState.Error) {
        return;
      }

      if (this.authState === AuthState.Idle) {
        await this.updateAccessToken();
      } else {
        const config = await this.requestConfig();
        const isValidAccessToken = await axios
          .get(`services/data/${SALESFORCE_API_VERSION}`, config)
          .then(() => true)
          .catch(() => false);

        if (!isValidAccessToken) {
          await this.updateAccessToken();
        }
      }
    } catch {}
  }

  private async updateAccessToken(): Promise<void> {
    this.logger.log('update access token');
    try {
      this.authState = AuthState.Updating;

      const { refreshToken, clientId, clientSecret, loginUrl } = Container.get(Tokens.salesforce) as any;

      const { data } = await axios.post(joinURL(loginUrl, '/services/oauth2/token'), null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        },
      });

      this.instanceUrl = data.instance_url;
      this.accessToken = data.access_token;
      this.tokenType = data.token_type;

      this.authState = AuthState.Active;

      this.logger.log('access token updated for %s', this.instanceUrl);
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data || error.message;

      this.logger.error('update access token failed: %s', message);

      this.authState = AuthState.Error;

      throw new InvalidRefreshTokenError(ERR_INVALID_SALESFORCE_TOKEN);
    }
  }

  public async forceUpdateToken(): Promise<void> {
    this.logger.log('force update token');
    if (this.authState === AuthState.Updating || this.authState === AuthState.Idle) {
      await sleep(this.AUTH_WAIT_TIME);
      return this.forceUpdateToken();
    }

    if (this.authState === AuthState.Error) {
      throw new InvalidRefreshTokenError(ERR_INVALID_SALESFORCE_TOKEN);
    }

    await this.updateAccessToken();
  }

  public async waitAuth(): Promise<void> {
    if (this.authState === AuthState.Error) {
      this.logger.log('create authorized request failed: authorization error');

      throw new UnauthorizedSalesforceError();
    }

    if (this.authState !== AuthState.Active) {
      this.logger.log('create authorized request failed: authorization is not done');

      await sleep(this.AUTH_WAIT_TIME);
      return this.waitAuth();
    }
  }

  public getAuthData(): { orgId: string; accessToken: string; instanceUrl: string } {
    return {
      orgId: this.orgId,
      accessToken: this.accessToken,
      instanceUrl: this.instanceUrl,
    };
  }

  public async requestConfig(): Promise<AxiosRequestConfig> {
    await this.waitAuth();

    return {
      baseURL: this.instanceUrl,
      headers: {
        accept: 'application/json',
        authorization: `${this.tokenType} ${this.accessToken}`,
      },
    };
  }
}
