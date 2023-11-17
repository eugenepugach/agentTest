import { ComponentDetails, GenerateZipBody } from '@/modules/functions/types/salesforce-request.type';
import { AttachmentDetails } from '@/modules/shared/types/attachment-details.type';
import { SALESFORCE_API_VERSION } from '@/constants';
import path from 'path';
import { extractComponentPermissions } from '@/modules/functions/utils/extract-component-permissions';
import { Builder } from 'xml2js';
import { FlosumComponent } from '@/modules/git/salesforce/types/flosum-component.type';
import { Zip } from '@/modules/git/parsers/utils/zip';
import { MDApiWriter } from '@/modules/git/parsers/mdapi';
import { FS } from '@/modules/git/internal/fs.internal';
import { rm } from 'fs/promises';
import { AxiosInstance } from 'axios';
import { CustomRestResponse } from '@/modules/shared/types/custom-rest-response.type';
import { ComponentsApi, MAX_ZIP_SIZE } from '@/modules/functions/utils/components-api';
import admZip from 'adm-zip';
import { v4 } from 'uuid';
import {
  fetchAttachmentBody,
  fetchAttachmentsDetailsById,
  retrieveAttachments,
} from '@/modules/shared/utils/fetch-attachments';

const DESTRUCTIVE_CHANGES_PER_NAME = 'destructiveChangesPre.xml';
const DESTRUCTIVE_CHANGES_POST_NAME = 'destructiveChangesPost.xml';
const DEPLOY_DIR_NAME = 'DEPLOYZIP';

export async function generateAndDeployZip(
  {
    attachmentsId,
    isExtractComponentsPermissions,
    preDestructiveAttachmentId,
    postDestructiveAttachmentId,
    branchId,
    credentials,
    metadataLogId,
    environments,
    metaTypes,
  }: GenerateZipBody,
  request: AxiosInstance
): Promise<string> {
  const uuidName = v4();
  try {
    const attachmentsDetails: AttachmentDetails[] = await fetchAttachmentsDetailsById(request, attachmentsId);

    const attachmentsNameByIdMap = attachmentsDetails.reduce(
      (attachmentsMap, attachment) => ({
        ...attachmentsMap,
        [attachment.Id]: attachment.Name,
      }),
      {} as Record<string, string>
    );

    const components: FlosumComponent[] = await getComponents(attachmentsDetails, request, attachmentsNameByIdMap);

    const componentsDetails = await ComponentsApi.fetchComponentsDetailsByComponentsHistory(
      request,
      attachmentsDetails.map(({ ParentId }) => ParentId)
    ).then((result) => ComponentsApi.removeNamespacePrefix(result));

    if (isExtractComponentsPermissions) {
      const componentsWithPermissions = components.filter(
        ({ fileType }) => fileType === 'Profile' || fileType === 'PermissionSet'
      );
      await removePermission(componentsWithPermissions, componentsDetails);
    }

    await replaceEnvironments(metaTypes, environments, components);
    await writeZip(components, uuidName);
    await generateAndWritePackageXML(attachmentsDetails, componentsDetails, uuidName);

    if (preDestructiveAttachmentId) {
      await saveDestructiveChanges(request, preDestructiveAttachmentId, DESTRUCTIVE_CHANGES_PER_NAME, uuidName);
    }

    if (postDestructiveAttachmentId) {
      await saveDestructiveChanges(request, postDestructiveAttachmentId, DESTRUCTIVE_CHANGES_POST_NAME, uuidName);
    }

    const zip = (
      await createDeployZip(uuidName).then((result) => {
        return result;
      })
    )
      .toBuffer()
      .toString('base64');
    console.log('after create zip');

    const zipLength = zip.length;

    if (zipLength >= MAX_ZIP_SIZE) {
      const firstZip = await createDeployZip(uuidName);
      console.log('after create second zip');
      const [zipFirst, secondZip] = await ComponentsApi.splitZip(firstZip, zipLength);

      const firstId = await insertZip(
        request,
        branchId,
        credentials.orgId,
        metadataLogId,
        zipFirst.toBuffer().toString('base64')
      );

      const secondId = await insertZip(
        request,
        branchId,
        credentials.orgId,
        metadataLogId,
        secondZip.toBuffer().toString('base64')
      );

      return `${firstId},${secondId}`;
    } else {
      return await insertZip(request, branchId, credentials.orgId, metadataLogId, zip);
    }
  } catch (error) {
    throw error;
  } finally {
    if (await FS.exists(path.join(process.cwd(), '.temp', uuidName)))
      await rm(path.join(process.cwd(), '.temp', uuidName), { recursive: true });
  }
}

async function getComponents(
  attachmentsDetails: AttachmentDetails[],
  request: AxiosInstance,
  idsNames: Record<string, string>
): Promise<FlosumComponent[]> {
  const components: FlosumComponent[] = [];
  const attachments = await retrieveAttachments(attachmentsDetails, request);

  await getComponentFromZip(attachments, idsNames).then((result) => {
    components.push(...result);
  });

  return components;
}

async function getComponentFromZip(
  attachments: CustomRestResponse[],
  idsNames: Record<string, string>
): Promise<FlosumComponent[]> {
  const components: FlosumComponent[] = [];

  for (const attachment of attachments) {
    const zip = await Zip.unzip(attachment.values.Body);

    for (const fileName in zip.files) {
      if (!zip.files[fileName].dir) {
        components.push({
          fileName: fileName.substring(fileName.indexOf('/') + 1), //remove dir name
          fileType: idsNames[attachment.id],
          body: attachment.values.Body,
        });
      }
    }
  }

  return components;
}

async function removePermission(components: FlosumComponent[], componentsDetails: ComponentDetails[]): Promise<void> {
  for (const component of components) {
    const archive = await Zip.unzip(component.body);
    const result: { fileName: string; body: string | Buffer }[] = [];

    for (const fileName in archive.files) {
      if (!archive.files[fileName].dir) {
        result.push({
          fileName,
          body: await archive.files[fileName].async('text'),
        });
      }
    }

    const readyComponent = await extractComponentPermissions(
      result[0].body.toString(),
      componentsDetails,
      component.fileType
    );

    const builder = new Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });
    const xml = builder.buildObject(readyComponent);
    const zip = Zip.createZip();
    zip.file(result[0].fileName, xml);
    component.body = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }
}

async function replaceEnvironments(
  metaTypes: string[],
  environments: Record<string, string>,
  components: FlosumComponent[]
): Promise<void> {
  for (const component of components) {
    if (metaTypes.every((metaType) => metaType !== component.fileType)) {
      continue;
    }

    const zip = await Zip.unzip(component.body);

    for (const fileName in zip.files) {
      if (!zip.files[fileName].dir) {
        let content = await zip.files[fileName].async('text');

        for (const environmentToReplace of Object.keys(environments)) {
          const regularToReplace = new RegExp(`%%${environmentToReplace}%%`, 'g');
          content = content.replace(regularToReplace, environments[environmentToReplace]);
        }
        zip.file(fileName, content);
      }
    }
    component.body = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }
}

async function writeZip(components: FlosumComponent[], uuidName: string): Promise<void> {
  const writer = new MDApiWriter({
    components,
    sourceDir: path.join(process.cwd(), '.temp', uuidName, DEPLOY_DIR_NAME, 'src'),
    skipChildErrors: false,
  });

  await writer.start();
}

async function generateAndWritePackageXML(
  attachmentsBodyLength: AttachmentDetails[],
  componentsDetails: ComponentDetails[],
  uuidName: string
): Promise<void> {
  const componentsTypeAndName = getComponentsTypeAndName(attachmentsBodyLength, componentsDetails);
  const componentsType = [...new Set(componentsTypeAndName.map((component: { type: string }) => component.type))];

  const packageXmlObject = {
    Package: {
      $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
      types: [] as { members: string[]; name: string }[],
      version: `${SALESFORCE_API_VERSION.substring(1)}`,
    },
  };

  for (const componentType of componentsType) {
    const componentsName = componentsTypeAndName
      .filter((component) => component.type === componentType)
      .map((componentName) => componentName.name);

    const packageXMLComponent = {
      members: componentsName,
      name: componentType,
    };

    packageXmlObject.Package.types.push(packageXMLComponent);
  }

  const builder = new Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });
  const packageXml = builder.buildObject(packageXmlObject);
  await FS.writeFile(path.join(process.cwd(), '.temp', uuidName, DEPLOY_DIR_NAME, 'src', 'package.xml'), packageXml);
}

function getComponentsTypeAndName(
  attachmentDetails: AttachmentDetails[],
  componentDetails: ComponentDetails[]
): { name: string; type: string }[] {
  return attachmentDetails.reduce((attachments, currentAttachment) => {
    const component = componentDetails.find((component) => component.Id === currentAttachment.ParentId);

    if (component) {
      attachments.push({
        name: component.Component__r.Component_Name__c,
        type: currentAttachment.Name,
      });
    }

    return attachments;
  }, [] as { name: string; type: string }[]);
}

async function saveDestructiveChanges(request: AxiosInstance, id: string, fileName: string, uuidName: string) {
  const data = (await fetchAttachmentBody(request, id)).toString();
  await FS.writeFile(path.join(process.cwd(), '.temp', uuidName, DEPLOY_DIR_NAME, 'src', fileName), data);
}

async function createDeployZip(uuidName: string): Promise<admZip> {
  const zip = new admZip();
  await zip.addLocalFolder(path.join(process.cwd(), '.temp', uuidName, DEPLOY_DIR_NAME));
  return zip;
}

async function insertZip(
  request: AxiosInstance,
  branchId: string,
  orgId: string,
  metadataLogId: string,
  zip: string
): Promise<string> {
  const uploadBackupBody = {
    ParentId: branchId,
    Name: 'BUILD' + orgId,
    Description: 'BUILD' + metadataLogId,
    Body: zip,
  };

  const { data } = await request.post(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment`, uploadBackupBody);

  return data.id;
}
