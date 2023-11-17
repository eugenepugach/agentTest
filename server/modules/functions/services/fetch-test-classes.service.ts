import { ComponentDetails, RetrieveAttachmentRequestBody } from '@/modules/functions/types/salesforce-request.type';
import { AttachmentDetails } from '@/modules/shared/types/attachment-details.type';
import { SALESFORCE_API_VERSION } from '@/constants';
import { Zip } from '@/modules/git/parsers/utils/zip';
import { AxiosInstance } from 'axios';
import { ComponentsApi } from '@/modules/functions/utils/components-api';
import {
  fetchAttachments,
  fetchAttachmentsDetailsById,
  retrieveAttachments,
} from '@/modules/shared/utils/fetch-attachments';

const BINARY_FIELDS = ['Body'];
const ATTACHMENT_NAME = 'TEST CLASSES';
const ATTACHMENT_DESCRIPTION = 'TEST CLASSES';

export async function fetchTestClasses(body: RetrieveAttachmentRequestBody, request: AxiosInstance): Promise<void> {
  const attachmentsDetails = await fetchAttachmentsDetailsById(request, body.attachmentsId);

  const componentsDetails = await ComponentsApi.fetchComponentsDetailsByComponentsHistory(
    request,
    attachmentsDetails.map(({ ParentId }) => ParentId)
  ).then((result) => ComponentsApi.removeNamespacePrefix(result));

  const testClassesNames = await retrieveTestClasses(request, attachmentsDetails, componentsDetails);

  const uploadBackupBody = {
    ParentId: body.metadataLogId,
    Name: ATTACHMENT_NAME,
    Description: ATTACHMENT_DESCRIPTION,
    Body: Buffer.from(testClassesNames.join('\n')).toString('base64'),
  };

  await request.post(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment`, uploadBackupBody);
}

async function retrieveTestClasses(
  request: AxiosInstance,
  attachmentsDetails: AttachmentDetails[],
  componentsDetails: ComponentDetails[]
): Promise<string[]> {
  const testClassesNames: string[] = [];
  const attachments = await retrieveAttachments(attachmentsDetails, request);
  const attachmentsIds: string[] = attachments.map((attachment) => attachment.id);
  await getTestClassesNames(request, attachmentsIds, componentsDetails, attachmentsDetails).then((result) => {
    testClassesNames.push(...result);
  });

  return testClassesNames;
}

async function getTestClassesNames(
  request: AxiosInstance,
  attachmentsIds: string[],
  componentDetails: ComponentDetails[],
  attachmentsDetails: AttachmentDetails[]
): Promise<string[]> {
  const attachments = await fetchAttachments(request, BINARY_FIELDS, attachmentsIds);
  const classesNames = [];
  const attachmentsNamesMapById = attachmentsDetails.reduce((attachmentsMap, attachmentDetails) => {
    const name = componentDetails.find((record: ComponentDetails) => record.Id === attachmentDetails.ParentId)
      ?.Component__r.Component_Name__c;

    if (!name) {
      throw new Error('No component by attachment id');
    }

    return {
      ...attachmentsMap,
      [attachmentDetails.Id]: name,
    };
  }, {} as Record<string, string>);

  for (const attachment of attachments) {
    const zip = await Zip.unzip(attachment.values.Body);

    for (const fileName of Object.keys(zip.files)) {
      if (!zip.files[fileName].dir) {
        const content = await zip.files[fileName].async('string');
        const regex = new RegExp('@istest', 'i');

        if (regex.test(content)) {
          const name = attachmentsNamesMapById[attachment.id];

          if (!name) {
            throw new Error('No component by attachment id');
          }
          classesNames.push(name);
        }
      }
    }
  }

  return classesNames;
}
