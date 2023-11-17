import { FunctionCredentials, SaveBackupRequestBody } from '@/modules/functions/types/salesforce-request.type';
import { SALESFORCE_API_VERSION } from '@/constants';
import { rm, readFile, mkdir } from 'fs/promises';
import { SFDX } from '@/modules/git/salesforce/utils/sfdx.utils';
import { FS } from '@/modules/git/internal/fs.internal';
import { SFDXUtils } from '@/modules/functions/utils/sfdx.utils';
import { AuthUtils } from '@/modules/functions/utils/auth.utils';
import { AxiosInstance } from 'axios';
import admZip from 'adm-zip';
import { v4 } from 'uuid';
import { ComponentsApi, MAX_ZIP_SIZE } from '@/modules/functions/utils/components-api';
import { join } from 'path';

export async function retrieveZip(
  { backupAsyncId, credentials, metadataLogId }: SaveBackupRequestBody,
  request: AxiosInstance
): Promise<void> {
  const uuidName = v4();
  try {
    if (!(await FS.exists(`.temp/${uuidName}`))) {
      await mkdir(`.temp/${uuidName}`, { recursive: true });
    }

    await SFDXUtils.createSFDXProject(backupAsyncId, uuidName);
    await SFDXUtils.setInstanceUrl(credentials.instanceUrl, backupAsyncId, uuidName);

    await retrieveReport(backupAsyncId, credentials, uuidName);

    const baseZip = new admZip(await readFile(`.temp/${uuidName}/${backupAsyncId}/unpackaged.zip`));

    const zip = new admZip();

    for (const { entryName } of baseZip.getEntries()) {
      const fileContent = baseZip.getEntry(entryName)?.getData() as Buffer;
      zip.addFile(join('src', entryName), fileContent);
    }

    const zipLength = zip.toBuffer().toString('base64').length;

    if (zipLength >= MAX_ZIP_SIZE) {
      const [firstZip, secondZip] = await ComponentsApi.splitZip(zip, zipLength);

      const backupAttachmentBody = {
        ParentId: metadataLogId,
        Name: 'BACKUP ZIP',
        Description: 'BACKUP ZIP',
        Body: firstZip.toBuffer().toString('base64'),
      };

      await request.post(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment`, backupAttachmentBody);

      backupAttachmentBody.Body = secondZip.toBuffer().toString('base64');
      await request.post(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment`, backupAttachmentBody);
    } else {
      const backupAttachmentBody = {
        ParentId: metadataLogId,
        Name: 'BACKUP ZIP',
        Description: 'BACKUP ZIP',
        Body: zip.toBuffer().toString('base64'),
      };

      await request.post(`/services/data/${SALESFORCE_API_VERSION}/sobjects/Attachment`, backupAttachmentBody);
    }
  } catch (error) {
    throw error;
  } finally {
    await rm(`.temp/${uuidName}/${backupAsyncId}`, { recursive: true });
  }
}

async function retrieveReport(
  backupAsyncId: string,
  credentials: FunctionCredentials,
  uuidPath: string
): Promise<void> {
  const retrieveReportArgs =
    `force:mdapi:retrieve:report ` +
    `--json ` +
    `--jobid ${backupAsyncId} ` +
    `-r .temp/${uuidPath}/${backupAsyncId} ` +
    `-u ${credentials.accessToken}`;

  await SFDX.spawnPromise('sfdx', retrieveReportArgs).catch(async (error) => {
    if (SFDXUtils.isAuthorizationError(error)) {
      credentials.accessToken = await AuthUtils.updateAccessToken(
        credentials.instanceUrl,
        credentials.refreshToken,
        credentials.clientId,
        credentials.clientSecret
      );

      return retrieveReport(backupAsyncId, credentials, uuidPath);
    }
    throw error;
  });
}
