import { CompositeGraphsRequest, CompositeGraphsResponse } from '../types/salesforce-composite.type';
import { SalesforceError } from './salesforce.error';

export class CompositeGraphError extends SalesforceError {
  private graphErrors: any[] = [];

  constructor(message: string, request: CompositeGraphsRequest, response: CompositeGraphsResponse) {
    super(message);
    this.combineRequestWithResponse(request, response);
  }

  private combineRequestWithResponse(
    compositeRequest: CompositeGraphsRequest,
    compositeResponse: CompositeGraphsResponse
  ) {
    for (const graph of compositeRequest) {
      const requests = graph.compositeRequest;
      const responseResults = compositeResponse.graphs.find((g) => g.graphId === graph.graphId);

      if (responseResults) {
        const graphError = {
          graphId: graph.graphId,
          errors: [] as any[],
        };
        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const response = responseResults.graphResponse.compositeResponse[i];

          graphError.errors.push({
            method: request.method,
            url: request.url,
            requestBody: request.body,
            responseBody: response.body,
          });
        }

        this.graphErrors.push(graphError);
      }
    }
  }

  toJSON(): Record<string, any> {
    return {
      message: this.message,
      errors: this.graphErrors,
    };
  }
}
