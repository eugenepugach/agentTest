import { AxiosInstance } from 'axios';
import { AttachmentDetails } from '@/modules/shared/types/attachment-details.type';
import { chunkArray } from '@/modules/shared/utils/index';
import { SALESFORCE_API_VERSION } from '@/constants';
import { CustomRestResponse } from '@/modules/shared/types/custom-rest-response.type';
import { namespace } from '@/modules/functions/utils/salesforce-request';

const CHUNK_QUERY_SIZE = 500;
const REST_ATTACHMENT_MAX_SIZE = 2097152;
const REST_ATTACHMENT_COUNT = 100;
const BINARY_FIELDS = ['Body'];
const FIELD_PARENT_ID = 'ParentId';
const FIELD_ID = 'Id';

export async function retrieveAttachments(
  attachmentsDetails: AttachmentDetails[],
  request: AxiosInstance
): Promise<CustomRestResponse[]> {
  let size = 0;
  let attachmentsCount = 0;
  let attachmentsIds: string[] = [];
  const responses: CustomRestResponse[] = [];

  for (const attachmentDetails of attachmentsDetails) {
    if (attachmentDetails.BodyLength > REST_ATTACHMENT_MAX_SIZE) {
      const data = await fetchAttachmentBody(request, attachmentDetails.Id);
      responses.push({ id: attachmentDetails.Id, values: { Body: data.toString('base64') } });
      continue;
    }

    if (
      attachmentDetails.BodyLength + size > REST_ATTACHMENT_MAX_SIZE ||
      attachmentsCount + 1 >= REST_ATTACHMENT_COUNT
    ) {
      const attachments = await fetchAttachments(request, BINARY_FIELDS, attachmentsIds);
      responses.push(...attachments);
      attachmentsIds = [];
      size = 0;
      attachmentsCount = 0;
    }

    attachmentsIds.push(attachmentDetails.Id);
    size += attachmentDetails.BodyLength;
    attachmentsCount++;
  }

  if (attachmentsIds.length) {
    const attachments = await fetchAttachments(request, BINARY_FIELDS, attachmentsIds);
    responses.push(...attachments);
  }

  return responses;
}

export function fetchAttachmentsDetailsById(
  request: AxiosInstance,
  attachmentsId: string[]
): Promise<AttachmentDetails[]> {
  return fetchAttachmentsDetails(request, FIELD_ID, attachmentsId);
}

export function fetchAttachmentsDetailsByParentId(
  request: AxiosInstance,
  parentsId: string[]
): Promise<AttachmentDetails[]> {
  return fetchAttachmentsDetails(request, FIELD_PARENT_ID, parentsId);
}

async function fetchAttachmentsDetails(
  request: AxiosInstance,
  idFieldName: string,
  idList: string[]
): Promise<AttachmentDetails[]> {
  const attachmentDetails: AttachmentDetails[] = [];
  const idsChunks = chunkArray<string>(idList, CHUNK_QUERY_SIZE);

  for (const idsChunk of idsChunks) {
    const query = `
      SELECT Id, Name, BodyLength, ParentId
      FROM Attachment
      WHERE ${idFieldName} IN (${"'" + idsChunk.join("','") + "'"})`;

    const { data } = await request.get(`/services/data/${SALESFORCE_API_VERSION}/query/`, {
      params: {
        q: query,
      },
    });

    attachmentDetails.push(...data.records);
  }

  return attachmentDetails;
}

export async function fetchAttachmentBody(request: AxiosInstance, id: string): Promise<Buffer> {
  const { data } = await request.get(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment/${id}/body`, {
    responseType: 'arraybuffer',
  });

  return data;
}

export async function fetchAttachments(
  request: AxiosInstance,
  binaryFields: string[],
  attachmentsIds: string[]
): Promise<CustomRestResponse[]> {
  const { data } = await request.post(`/services/apexrest${namespace}/retrieveAttachments/`, {
    objectName: 'Attachment',
    binaryFields: binaryFields,
    recordIds: attachmentsIds,
  });
  return data;
}
