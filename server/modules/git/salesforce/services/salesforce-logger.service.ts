import { Logger } from '@/core';
import { SalesforceError } from '../errors/salesforce.error';
import { SalesforceService } from './salesforce.service';

export class SalesforceLogger {
  private logger = new Logger(SalesforceLogger.name);
  private messages: string[] = [];

  constructor(private salesforce: SalesforceService) {}

  log(message: string): void {
    this.messages.push(message);
  }

  async send(): Promise<void> {
    try {
      this.logger.info('sending logs to salesforce');
      if (this.messages.length) {
        await this.salesforce.sendLog(this.messages);
        this.messages = [];
      }
    } catch (error) {
      this.logger.error(error);
      throw new SalesforceError(error);
    }
  }
}
