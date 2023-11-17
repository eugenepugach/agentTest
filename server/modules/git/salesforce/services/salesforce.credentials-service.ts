import Container from 'typedi';
import { Tokens } from '@/modules/git/providers/providers.tokens';

export class SalesforceCredentialsService {
  static getLoginUrl(clientType: string) {
    return `https://${clientType === 'Sandbox' ? 'test' : 'login'}.salesforce.com`;
  }

  static setCredentials() {
    const salesforceToken: string | undefined = process.env.SALESFORCE_TOKEN;

    if (!salesforceToken) {
      return;
    }

    const [refreshToken, clientId, clientSecret, type]: string[] = salesforceToken.trim().split(' ');

    if (!refreshToken || !clientId || !clientSecret || !type) {
      throw new Error();
    }

    Container.set(Tokens.salesforce, {
      refreshToken,
      clientId,
      clientSecret,
      type,
      loginUrl: this.getLoginUrl(type),
    });
  }
}
