import { SALESFORCE_API_VERSION, SALESFORCE_MAX_REQUEST_SIZE_BYTES } from '@/constants';
import { AxiosInstance } from 'axios';
import { Service } from 'typedi';
import { CompositeGraphError } from '../errors/composite-graph.error';
import { SalesforceError } from '../errors/salesforce.error';
import { CompositeGraphsRequest, CompositeGraphsResponse } from '../types/salesforce-composite.type';
import { createSalesforceRequest } from '../utils/create-request.util';
import { SalesforceAuthService } from './salesforce-auth.service';

@Service()
export class SalesforceCompositeService {
  private request: AxiosInstance;

  constructor(salesforceAuth: SalesforceAuthService) {
    this.request = createSalesforceRequest(salesforceAuth);
  }

  public async executeGraphs(graphs: CompositeGraphsRequest): Promise<CompositeGraphsResponse> {
    try {
      const { data } = await this.request.post<CompositeGraphsResponse>(
        `/services/data/${SALESFORCE_API_VERSION}/composite/graph`,
        {
          graphs,
        },
        {
          maxBodyLength: SALESFORCE_MAX_REQUEST_SIZE_BYTES,
        }
      );

      if (!data.graphs.every((graph) => graph.isSuccessful)) {
        throw new CompositeGraphError(`Unsuccessful composite request`, graphs, data);
      }

      return data;
    } catch (error) {
      if (error instanceof SalesforceError) {
        throw error;
      }

      throw new SalesforceError(error);
    }
  }
}
