import { Controller, Logger, param, Post, Version } from '@/core';
import {
  GenerateZipBody,
  RetrieveAttachmentRequestBody,
  SaveBackupRequestBody,
  DeployComponentsRequestBody,
  OptionType,
} from '@/modules/functions/types/salesforce-request.type';
import { retrieveZip } from '@/modules/functions/services/retrieve-zip.service';
import { generateAndDeployZip } from '@/modules/functions/services/generate-zip.service';
import { fetchTestClasses } from '@/modules/functions/services/fetch-test-classes.service';
import { deployComponents } from '@/modules/functions/services/deploy-attachment.service';
import { createRequest, namespace } from '@/modules/functions/utils/salesforce-request';
import { AuthUtils } from '@/modules/functions/utils/auth.utils';

const logger = new Logger('server');

@Controller('functions')
@Version('v1')
export class FunctionsController {
  @Post('retrieve')
  private async retrieveZip(@param.body() body: SaveBackupRequestBody): Promise<{ message: string }> {
    const request = createRequest(AuthUtils.getAuthParameters(body.instanceUrl));
    retrieveZip(body, request)
      .then(() => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.SAVE_BACKUP_ZIP,
        });
      })
      .catch((error) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.ERROR,
          message: error.message || error,
        });
      })
      .catch((error) => logger.error(error.message));

    return { message: 'Job started successfully' };
  }

  @Post('fetch-test-classes')
  private async fetchTestClasses(@param.body() body: RetrieveAttachmentRequestBody): Promise<{ message: string }> {
    const request = createRequest(AuthUtils.getAuthParameters(body.instanceUrl));
    fetchTestClasses(body, request)
      .then(() => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.GET_TESTS,
        });
      })
      .catch((error) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.ERROR,
          message: error.message || error,
        });
      })
      .catch((error) => logger.error(error.message));

    return { message: 'Job started successfully' };
  }

  @Post('generate-deploy-zip')
  private async generateAndDeployZip(@param.body() body: GenerateZipBody): Promise<{ message: string }> {
    const request = createRequest(AuthUtils.getAuthParameters(body.instanceUrl));
    generateAndDeployZip(body, request)
      .then((id) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.SAVE_DEPLOY_ZIP,
          attachment: id,
        });
      })
      .catch((error) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.ERROR,
          message: error.message || error,
        });
      })
      .catch((error) => logger.error(error.message));

    return { message: 'Job started successfully' };
  }

  @Post('deploy-components')
  private async deployComponents(@param.body() body: DeployComponentsRequestBody): Promise<{ message: string }> {
    const request = createRequest(AuthUtils.getAuthParameters(body.instanceUrl));
    deployComponents(body, request)
      .then((deployId) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          asyncId: deployId,
          opType: OptionType.DEPLOY,
        });
      })
      .catch((error) => {
        return request.post(`/services/apexrest${namespace}/async`, {
          mdlId: body.metadataLogId,
          opType: OptionType.ERROR,
          message: error.message || error,
        });
      })
      .catch((error) => logger.error(error.message));

    return { message: 'Job started successfully' };
  }
}
