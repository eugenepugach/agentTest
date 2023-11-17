import { SalesforceAuthDetails } from '@/modules/veeva-vault/interfaces/auth-details.interfaces';
import axios from 'axios';
import { joinURL } from '@/modules/shared/utils';
import { BaseVeevaAuth } from '@/modules/veeva-vault/classes/auth/base-veeva-auth';

export class SalesforceAuth extends BaseVeevaAuth {
  constructor(public readonly auth: SalesforceAuthDetails) {
    super(auth);
  }

  protected async getNewAccessToken(): Promise<string> {
    const { accessToken } = await SalesforceAuth.getAuthDetails();
    return accessToken;
  }

  public static async getAuthDetails(): Promise<SalesforceAuthDetails> {
    const salesforceToken: string | undefined = process.env.SALESFORCE_TOKEN;

    if (!salesforceToken) {
      throw new Error('Salesforce token missing');
    }

    const [refreshToken, clientId, clientSecret, type]: string[] = salesforceToken.trim().split(' ');

    if (!refreshToken || !clientId || !clientSecret || !type) {
      throw new Error('One of the parameters in Salesforce Token is missing');
    }

    const loginUrl = SalesforceAuth.getLoginUrl(type);

    const { data } = await axios.post(joinURL(loginUrl, '/services/oauth2/token'), null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
    });

    return {
      instanceUrl: data.instance_url,
      accessToken: data.access_token,
    };
  }

  private static getLoginUrl(type: string): string {
    switch (type) {
      case 'Sandbox':
        return 'https://test.salesforce.com';
      case 'Production':
        return 'https://login.salesforce.com';
      default:
        throw new Error(`Unknown Salesforce Organization type: ${type}`);
    }
  }
}
