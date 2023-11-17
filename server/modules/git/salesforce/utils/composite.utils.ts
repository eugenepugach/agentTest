import { SALESFORCE_API_VERSION } from '@/constants';
import { randomString } from '@/modules/shared/utils';
import { CompositeGraphsResponse, CompositeRequestBody } from '../types/salesforce-composite.type';

export function createPostRequest(
  resource: string,
  body: Record<string, any>
): { reference: string; request: CompositeRequestBody } {
  const referenceId = `${randomString(8)}`;

  const request: CompositeRequestBody = {
    method: 'POST',
    url: `/services/data/${SALESFORCE_API_VERSION}/sobjects/${resource}`,
    body,
    referenceId,
  };

  return {
    request,
    reference: referenceId,
  };
}

export function createPatchRequest(
  resource: string,
  resourceId: string,
  body: Record<string, any>
): { reference: string; request: CompositeRequestBody } {
  const referenceId = `${resourceId}_${randomString(8)}`;

  const request: CompositeRequestBody = {
    method: 'PATCH',
    url: `/services/data/${SALESFORCE_API_VERSION}/sobjects/${resource}/${resourceId}`,
    body,
    referenceId,
  };

  return {
    request,
    reference: referenceId,
  };
}

export function createDeleteRequest(
  resource: string,
  resourceId: string
): { reference: string; request: CompositeRequestBody } {
  const referenceId = `${resourceId}_${randomString(8)}`;

  const request: CompositeRequestBody = {
    method: 'DELETE',
    url: `/services/data/${SALESFORCE_API_VERSION}/sobjects/${resource}/${resourceId}`,
    referenceId,
  };

  return {
    request,
    reference: referenceId,
  };
}

export function extractComponentIdsFromGraphsResponse(
  response: CompositeGraphsResponse
): { id: string; ref: string }[] {
  const { graphs } = response;

  return graphs
    .map((graph) =>
      graph.graphResponse.compositeResponse.map((resp) => ({
        id: (resp.body as any)?.id,
        ref: resp.referenceId,
      }))
    )
    .flat();
}
