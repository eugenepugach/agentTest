import { AxiosInstance } from 'axios';
import { Service } from 'typedi';
import { FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE, SALESFORCE_API_VERSION } from '@/constants';
import { SalesforceError } from '../errors/salesforce.error';
import { createSalesforceRequest } from '../utils/create-request.util';
import { SalesforceAuthService } from './salesforce-auth.service';

@Service()
export class SalesforceQueryService {
  private request: AxiosInstance;

  constructor(salesforceAuth: SalesforceAuthService) {
    this.request = createSalesforceRequest(salesforceAuth);
  }

  private parseSoqlString(soql: string): string {
    return soql.replace(/\%namespace\%/g, FLOSUM_GIT_NAMESPACE).replace(/\%flosum_namespace\%/g, FLOSUM_NAMESPACE);
  }

  public getRequest(): AxiosInstance {
    return this.request;
  }

  public async query<T>(query: string): Promise<T[]> {
    try {
      const encodedQuery = encodeURI(this.parseSoqlString(query));

      const url = `services/data/${SALESFORCE_API_VERSION}/query/?q=${encodedQuery}`;

      const { data } = await this.request.get(url);

      const records: T[] = data.records;
      let nextUrl = data.nextRecordsUrl;

      while (nextUrl) {
        const { data: dataNext } = await this.request.get(nextUrl);

        nextUrl = dataNext.nextRecordsUrl;

        records.push(...dataNext.records);
      }

      return records;
    } catch (error) {
      throw new SalesforceError(error);
    }
  }
}
