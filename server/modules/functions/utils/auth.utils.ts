import axios from 'axios';
import { AuthParameters } from '@/modules/functions/types/salesforce-request.type';

export class AuthUtils {
  public static async updateAccessToken(
    instanceUrl: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    const { data } = await axios.post(`${instanceUrl}/services/oauth2/token`, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
    });

    return data.access_token;
  }

  public static getAuthParameters(instanceUrl: string): AuthParameters {
    const salesforceToken: string | undefined = process.env.SALESFORCE_TOKEN;

    if (!salesforceToken) {
      throw new Error('Salesforce token missing');
    }

    const [refreshToken, clientId, clientSecret, type]: string[] = salesforceToken.trim().split(' ');

    if (!refreshToken || !clientId || !clientSecret || !type) {
      throw new Error('One of the parameters is missing');
    }

    return {
      instanceUrl,
      refreshToken,
      clientId,
      clientSecret,
    };
  }
}
