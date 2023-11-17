import { Container, Service } from 'typedi';
import { FLOSUM_GIT_NAMESPACE, IGNORE_FLOSUM_GIT_NAMESPACE } from '@/constants';
import { Logger } from '@/core';
import { SalesforceError } from '../errors/salesforce.error';
import { createSalesforceRequest } from '../utils/create-request.util';
import { SalesforceAuthService } from './salesforce-auth.service';
import { SalesforceRestService } from './salesforce-rest.service';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { LoggerTypes, Message } from '@/modules/git/salesforce/types/sf-logger-v3-types';
import { ERR_INVALID_LOGGER_TYPE } from '@/constants/errors';

const LOGG_TYPES = {
  info: 'INFO',
  warning: 'WARNING',
  error: 'ERROR',
};

@Service()
export class SalesforceLogger3 {
  private request = createSalesforceRequest(Container.get(SalesforceAuthService));
  private logger = new Logger(SalesforceLogger3.name);
  private _messages: Message[] = [];

  constructor(private loggerId: string) {}

  public getLoggerId(): string {
    return this.loggerId;
  }

  public setLoggerId(loggerID: string): void {
    this.loggerId = loggerID;
  }

  public async send(): Promise<void> {
    try {
      if (!this.loggerId) {
        return;
      }
      const logs = this._messages;
      this._messages = [];

      if (this.loggerId && logs.length) {
        await this.request.post(`services/apexrest${IGNORE_FLOSUM_GIT_NAMESPACE ? '' : '/flosum_git'}/logger`, {
          messages: logs,
          loggerId: this.loggerId,
        });
      }
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public log(message: string): SalesforceLogger3 {
    this.logger.log('[message] %s', `[INFO] ${message}`);
    this._messages.push({ timestamp: Date.now(), type: LOGG_TYPES.info, message });
    return this;
  }

  public warning(message: string): SalesforceLogger3 {
    this.logger.log('[message] %s', `[WARNING] ${message}`);
    this._messages.push({ timestamp: Date.now(), type: LOGG_TYPES.warning, message });
    return this;
  }

  public error(message: string): SalesforceLogger3 {
    this.logger.error('[message] %s', `[ERROR] ${message}`);
    this._messages.push({ timestamp: Date.now(), type: LOGG_TYPES.error, message });
    return this;
  }

  public static async createLoggerId(type: LoggerTypes): Promise<string> {
    if (!type) {
      throw new Error(ERR_INVALID_LOGGER_TYPE);
    }

    const rest = Container.get(SalesforceRestService);

    try {
      return await rest.post(`${FLOSUM_GIT_NAMESPACE}Log__c`, {
        [`${FLOSUM_GIT_NAMESPACE}Type__c`]: type,
      });
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
