import { Inject, Service } from 'typedi';
import { Logger } from '@/core';
import { InternalServerError } from '@/core/errors/internal-server.error';
import { SalesforceAuthService } from './salesforce-auth.service';
import { AxiosInstance } from 'axios';
import { IGNORE_FLOSUM_GIT_NAMESPACE, SALESFORCE_API_VERSION } from '@/constants';
import { FlosumAttachmentsResponse } from '../types/flosum-attachments-response.type';
import { createSalesforceRequest } from '../utils/create-request.util';
import { AnyType } from '@/core/types/any.type';
import { SalesforceLogger } from './salesforce-logger.service';
import { SalesforceError } from '../errors/salesforce.error';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';

@Service({ transient: true })
export class SalesforceService {
  private readonly namespace: string;
  private loggerId: string;
  private request: AxiosInstance;
  private internalLogger: SalesforceLogger;
  private logger = new Logger(SalesforceService.name);

  constructor(@Inject() salesforceAuth: SalesforceAuthService) {
    this.request = createSalesforceRequest(salesforceAuth);
    this.namespace = IGNORE_FLOSUM_GIT_NAMESPACE ? '' : '/flosum_git';
  }

  setLoggerId(id: string): void {
    this.loggerId = id;
    this.internalLogger = new SalesforceLogger(this);
  }

  getLogger(): SalesforceLogger {
    return this.internalLogger;
  }

  async retrieveComponents(ids: string[]): Promise<FlosumAttachmentsResponse> {
    try {
      this.logger.log('retrieve components  %d from salesforce', ids.length);

      const response = await this.request
        .post(`services/apexrest${this.namespace}/attachments`, {
          componentIds: ids,
          loggerId: this.loggerId,
        })
        .then(({ data }) => data);

      return response;
    } catch (error) {
      this.logger.error(error);
      throw new SalesforceError(error);
    }
  }

  async deleteAttachment(id: string): Promise<void> {
    try {
      this.logger.log('delete attachment %s from salesforce', id);

      await this.request.delete(`services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment/${id}`);
    } catch (error) {
      this.logger.error(error);
      throw new SalesforceError(error);
    }
  }

  async retrieveAttachment<T>(id: string, asBuffer = false): Promise<T> {
    try {
      this.logger.log('retrieve attachment %s from salesforce', id);
      const attachment: T = await this.request
        .get(`services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment/${id}/body`, {
          responseType: asBuffer ? 'arraybuffer' : 'text',
        })
        .then(({ data }) => data);
      return attachment;
    } catch (error) {
      this.logger.error(error);
      throw new SalesforceError(error);
    }
  }

  async sendLog(messages: string[]): Promise<void> {
    try {
      messages.forEach((message) => this.logger.log('[message] %s', message));
      await this.request.post(`services/apexrest${this.namespace}/logger`, {
        messages,
        loggerId: this.loggerId,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(error);
    }
  }

  async createObject<T>(type: string, body: Partial<T>): Promise<string> {
    try {
      const { data } = await this.request.post(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}/`, body);

      return data.id;
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  async patchObject(type: string, id: string, body: AnyType): Promise<void> {
    try {
      await this.request.patch(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}/${id}`, body);
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  async fetchConnection(connectionId: string): Promise<ConnectionDto> {
    try {
      const { data } = await this.request.get(`services/apexrest${this.namespace}/connection`, {
        params: {
          connectionId,
        },
      });

      return new ConnectionDto(data);
    } catch (error) {
      throw new SalesforceError(error);
    }
  }
}
