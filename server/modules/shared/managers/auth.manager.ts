import axios from 'axios';
import { AuthDetails } from '@data-masking-job/interfaces/job.interfaces';
import { AuthorizationManager } from '@flosum/salesforce';

export class AuthManager extends AuthorizationManager {
  private readonly _refreshToken: string;
  private readonly _clientId: string;
  private readonly _clientSecret: string;

  constructor({ accessToken, refreshToken, instanceUrl, clientId, clientSecret }: AuthDetails) {
    super({ accessToken, instanceUrl });
    this._clientSecret = clientSecret;
    this._clientId = clientId;
    this._refreshToken = refreshToken;
  }

  protected async refreshToken(): Promise<string> {
    const { data } = await axios.post(`${this.instanceUrl}/services/oauth2/token`, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: this._refreshToken,
        client_id: this._clientId,
        client_secret: this._clientSecret,
      },
    });

    return data.access_token;
  }
}
