import Container from 'typedi';
import { FLOSUM_GIT_NAMESPACE, IGNORE_FLOSUM_GIT_NAMESPACE } from '@/constants';
import { Logger } from '@/core';
import { SalesforceError } from '../errors/salesforce.error';
import { createSalesforceRequest } from '../utils/create-request.util';
import { SalesforceAuthService } from './salesforce-auth.service';
import { SalesforceRestService } from './salesforce-rest.service';

export class SalesforceLogger2 {
  private request = createSalesforceRequest(Container.get(SalesforceAuthService));
  private logger = new Logger(SalesforceLogger2.name);
  private messages: string[] = [];

  constructor(private loggerId?: string, private prefix?: string) {}

  public setLoggerId(loggerId: string): void {
    this.loggerId = loggerId;
  }

  public getLoggerId(): string {
    return this.loggerId || '';
  }

  public getPrefix(): string {
    return this.prefix || '';
  }

  public async send(): Promise<void> {
    try {
      if (!this.loggerId) {
        return;
      }

      const messages = this.messages.splice(0).map((message) => `${this.prefix || ''}${message}`);

      if (this.loggerId && messages.length) {
        await this.request.post(`services/apexrest${IGNORE_FLOSUM_GIT_NAMESPACE ? '' : '/flosum_git'}/logger`, {
          messages: messages,
          loggerId: this.loggerId,
        });
      }
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public log(message: string): SalesforceLogger2 {
    this.logger.log('[message] %s', message);
    this.messages.push(message);
    return this;
  }

  public static async createLogger(): Promise<SalesforceLogger2> {
    try {
      const rest = Container.get(SalesforceRestService);

      const id = await rest.post(`${FLOSUM_GIT_NAMESPACE}Log__c`, {});

      return new SalesforceLogger2(id);
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public async removeLogger(): Promise<void> {
    try {
      if (!this.loggerId) {
        return;
      }

      const rest = Container.get(SalesforceRestService);

      await rest.delete(`${FLOSUM_GIT_NAMESPACE}Log__c`, this.loggerId);

      this.loggerId = '';
      this.messages = [];
    } catch (error) {
      throw new SalesforceError(error);
    }
  }
}
