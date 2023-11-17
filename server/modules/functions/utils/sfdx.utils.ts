import { SFDX } from '@/modules/git/salesforce/utils/sfdx.utils';
import { SFDXConstants } from '@/modules/functions/constants/sfdx.constants';

export class SFDXUtils {
  public static isAuthorizationError(error: Error): boolean {
    let errorJson: Record<string, any> = {};

    try {
      errorJson = JSON.parse(error.message);
    } catch {}

    return (
      errorJson &&
      errorJson.exitCode === 1 &&
      (errorJson.name === SFDXConstants.INVALID_SESSION_ID_CODE ||
        errorJson.name === SFDXConstants.NAMED_ORG_NOT_FOUND_CODE ||
        errorJson.name === SFDXConstants.METADATA_TRANSFER)
    );
  }

  public static async createSFDXProject(id: string, uuidPath: string): Promise<void> {
    const createProjectArgs = `force:project:create --json -t empty -n ${id}`;

    await SFDX.spawnPromise('sfdx', createProjectArgs, { cwd: `.temp/${uuidPath}` });
  }

  public static async setInstanceUrl(instanceUrl: string, id: string, uuidPath: string): Promise<void> {
    const setInstanceUrlArgs = `force:config:set -g instanceUrl=${instanceUrl} --json`;

    await SFDX.spawnPromise('sfdx', setInstanceUrlArgs, { cwd: `.temp/${uuidPath}/${id}` });
  }
}
