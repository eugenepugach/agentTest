import {
  DeployComponentsRequestBody,
  DeployOptions,
  FunctionCredentials,
} from '@/modules/functions/types/salesforce-request.type';
import { mkdir, rm, writeFile } from 'fs/promises';
import { SFDX } from '@/modules/git/salesforce/utils/sfdx.utils';
import { SFDXUtils } from '@/modules/functions/utils/sfdx.utils';
import { AuthUtils } from '@/modules/functions/utils/auth.utils';
import path from 'path';
import { AxiosInstance } from 'axios';
import { FS } from '@/modules/git/internal/fs.internal';
import { v4 } from 'uuid';
import admZip from 'adm-zip';
import { fetchAttachmentBody } from '@/modules/shared/utils/fetch-attachments';

const DESTRUCTIVE_CHANGES_POST_NAME = `destructiveChangesPost.xml`;
const DEPLOY_ZIP_NAME = 'deploy.zip';

export async function deployComponents(
  { attachmentId, credentials, postDestructiveAttachmentId, deployOptions }: DeployComponentsRequestBody,
  request: AxiosInstance
): Promise<string> {
  const uuidName = v4();
  try {
    const attachmentsIds = attachmentId.split(',');
    const attachmentZip = new admZip();

    for (const attachmentId of attachmentsIds) {
      await fetchAttachmentBody(request, attachmentId).then((result) => {
        const zip = new admZip(result);

        for (const entry of zip.getEntries()) {
          attachmentZip.addFile(entry.entryName, zip.getEntry(entry.entryName)?.getData() as Buffer);
        }
      });
    }

    if (!(await FS.exists(`.temp/${uuidName}`))) {
      await mkdir(`.temp/${uuidName}`, { recursive: true });
    }

    await SFDXUtils.createSFDXProject(attachmentId, uuidName);
    await SFDXUtils.setInstanceUrl(credentials.instanceUrl, attachmentId, uuidName);

    if (postDestructiveAttachmentId) {
      const postDestructiveAttachment = await fetchAttachmentBody(request, postDestructiveAttachmentId);

      attachmentZip.addFile(DESTRUCTIVE_CHANGES_POST_NAME, postDestructiveAttachment);
      await writeFile(`${process.cwd()}/.temp/${uuidName}/${DEPLOY_ZIP_NAME}`, attachmentZip.toBuffer());
    } else {
      await writeFile(`${process.cwd()}/.temp/${uuidName}/${DEPLOY_ZIP_NAME}`, attachmentZip.toBuffer());
    }

    const deployResult = await deploy(credentials, deployOptions, uuidName);

    return JSON.parse(deployResult).result.id;
  } catch (error) {
    throw error;
  } finally {
    await rm(path.join(process.cwd(), '.temp', uuidName), { recursive: true });
  }
}

function deploy(credentials: FunctionCredentials, deployOptions: DeployOptions, uuidPath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), '.temp', uuidPath, DEPLOY_ZIP_NAME);

  let deployOptionsArgs = `-f ${fullPath} -u ${credentials.accessToken}`;
  deployOptionsArgs += deployOptions.checkOnly ? ' -c' : '';
  deployOptionsArgs += deployOptions.testLevel ? ` -l ${deployOptions.testLevel}` : '';
  deployOptionsArgs += deployOptions.runTests ? ` -r ${deployOptions.runTests}` : '';
  deployOptionsArgs += deployOptions.ignoreWarnings ? ' -g' : '';
  deployOptionsArgs += deployOptions.purgeOnDelete ? ' -purgeondelete' : '';

  return SFDX.spawnPromise('sfdx', `force:mdapi:deploy --json ${deployOptionsArgs}`).catch(async (error) => {
    if (SFDXUtils.isAuthorizationError(error)) {
      credentials.accessToken = await AuthUtils.updateAccessToken(
        credentials.instanceUrl,
        credentials.refreshToken,
        credentials.clientId,
        credentials.clientSecret
      );

      return deploy(credentials, deployOptions, uuidPath);
    }

    throw error;
  });
}
