import { SALESFORCE_API_VERSION } from '@/constants';
import { AxiosInstance } from 'axios';
import { Service } from 'typedi';
import { SalesforceError } from '../errors/salesforce.error';
import { createSalesforceRequest } from '../utils/create-request.util';
import { SalesforceAuthService } from './salesforce-auth.service';

@Service()
export class SalesforceRestService {
  private request: AxiosInstance;

  constructor(auth: SalesforceAuthService) {
    this.request = createSalesforceRequest(auth);
  }

  public async delete(type: string, id: string): Promise<void> {
    try {
      await this.request.delete(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}/${id}`);
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public async get(type: string, id: string): Promise<any> {
    try {
      const response = await this.request.get(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}/${id}`);

      return response.data;
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public async post<T>(type: string, body: T): Promise<string> {
    try {
      const response = await this.request.post(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}`, body);

      return response.data.id;
    } catch (error) {
      throw new SalesforceError(error);
    }
  }

  public async patch<T>(type: string, id: string, body: T): Promise<void> {
    try {
      await this.request.patch(`services/data/${SALESFORCE_API_VERSION}/sobjects/${type}/${id}`, body);
    } catch (error) {
      throw new SalesforceError(error);
    }
  }
}
