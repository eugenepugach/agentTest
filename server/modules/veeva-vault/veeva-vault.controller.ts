import { Controller, param, Post, Version } from '@/core';

import {
  DependencyRequestBody,
  DeployRequestBody,
  RollbackRequestBody,
  SnapshotRequestBody,
} from '@/modules/veeva-vault/interfaces/request-body.interface';
import {
  ErrorResponseBody,
  SuccessDependencyResponseBody,
  SuccessResponseBody,
} from '@/modules/veeva-vault/interfaces/response-body.interfaces';
import { DependencyService } from '@/modules/veeva-vault/services/dependency.service';
import { SnapshotService } from '@/modules/veeva-vault/services/snapshot.service';
import { DeployService } from '@/modules/veeva-vault/services/deploy.service';
import { createVeevaRequest } from '@/modules/veeva-vault/utils/veeva-request.utils';
import { AppResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import shortid from 'shortid';
import { makeDir } from '@/modules/veeva-vault/utils/fs-util';
import { Logger } from '@/modules/veeva-vault/classes/loggers/logger';
import { rm } from 'fs/promises';
import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { createSalesforceRequest } from '@/modules/veeva-vault/utils/salesforce-request.utils';
import { VeevaAuth } from '@/modules/veeva-vault/classes/auth/veeva-auth';
import { SalesforceAuth } from '@/modules/veeva-vault/classes/auth/salesforce-auth';
import { RollbackService } from '@/modules/veeva-vault/services/rollback.service';

const JOB_UPDATE_TOKEN_ATTEMPTS = 1;

@Controller('veeva-vault')
@Version('v1.1')
export class VeevaVaultController {
  @Post('snapshot')
  private async doSnapshot(@param.body() body: SnapshotRequestBody): Promise<SuccessResponseBody | ErrorResponseBody> {
    const { veevaAuth, timeZone, attachmentLogId } = body;

    try {
      const connectionVeeva = createVeevaRequest(new VeevaAuth(veevaAuth, JOB_UPDATE_TOKEN_ATTEMPTS));
      const salesforceAuthDetails = await SalesforceAuth.getAuthDetails();
      const connectionSalesforce = createSalesforceRequest(new SalesforceAuth(salesforceAuthDetails));
      const logger = new Logger(connectionSalesforce, timeZone, attachmentLogId);
      const snapshotService = new SnapshotService(body, connectionSalesforce, connectionVeeva, logger);
      snapshotService.execute().then();
      return {
        responseStatus: AppResponseStatus.SUCCESS,
      };
    } catch (error) {
      return {
        responseStatus: AppResponseStatus.FAILURE,
        responseMessage: error.message,
      };
    }
  }

  @Post('deploy')
  private async deployFromBranch(
    @param.body() body: DeployRequestBody
  ): Promise<SuccessResponseBody | ErrorResponseBody> {
    const { veevaAuth, timeZone, attachmentLogId } = body;

    try {
      const connectionVeeva = createVeevaRequest(new VeevaAuth(veevaAuth, JOB_UPDATE_TOKEN_ATTEMPTS));
      const salesforceAuthDetails = await SalesforceAuth.getAuthDetails();
      const connectionSalesforce = createSalesforceRequest(new SalesforceAuth(salesforceAuthDetails));
      const logger = new Logger(connectionSalesforce, timeZone, attachmentLogId);
      const tempFolder = 'temp/veeva/deploy_' + shortid();
      await makeDir(tempFolder);
      const deployService = new DeployService(
        body,
        connectionSalesforce,
        connectionVeeva,
        logger,
        tempFolder,
        salesforceAuthDetails.instanceUrl
      );
      deployService.execute().finally(() => rm(tempFolder, { recursive: true, force: true }));
      return {
        responseStatus: AppResponseStatus.SUCCESS,
      };
    } catch (error) {
      return {
        responseStatus: AppResponseStatus.FAILURE,
        responseMessage: error.message,
      };
    }
  }

  @Post('dependency')
  private async retrieveDependency(
    @param.body() body: DependencyRequestBody
  ): Promise<SuccessDependencyResponseBody | ErrorResponseBody> {
    const { veevaAuth } = body;
    try {
      const connectionVeeva = createVeevaRequest(new VeevaAuth(veevaAuth));
      const salesforceAuthDetails = await SalesforceAuth.getAuthDetails();
      const connectionSalesforce = createSalesforceRequest(new SalesforceAuth(salesforceAuthDetails));
      const dependencyService = new DependencyService(body, connectionSalesforce, connectionVeeva);
      return await dependencyService.execute();
    } catch (error) {
      const errorMessage = error instanceof BaseVeevaError ? error.getMessages().join('\n') : error.message;
      return {
        responseStatus: AppResponseStatus.FAILURE,
        responseMessage: errorMessage,
      };
    }
  }

  @Post('rollback')
  private async rollback(@param.body() body: RollbackRequestBody): Promise<SuccessResponseBody | ErrorResponseBody> {
    const { veevaAuth, timeZone, attachmentLogId } = body;

    try {
      const connectionVeeva = createVeevaRequest(new VeevaAuth(veevaAuth, JOB_UPDATE_TOKEN_ATTEMPTS));
      const salesforceAuthDetails = await SalesforceAuth.getAuthDetails();
      const connectionSalesforce = createSalesforceRequest(new SalesforceAuth(salesforceAuthDetails));
      const logger = new Logger(connectionSalesforce, timeZone, attachmentLogId);
      const tempFolder = 'temp/veeva/rollback_' + shortid();
      await makeDir(tempFolder);

      const rollbackService = new RollbackService({
        ...body,
        connectionVeeva,
        connectionSalesforce,
        logger,
        tempFolder,
        instanceUrl: salesforceAuthDetails.instanceUrl,
      });

      rollbackService.execute().finally(() => rm(tempFolder, { recursive: true, force: true }));

      return {
        responseStatus: AppResponseStatus.SUCCESS,
      };
    } catch (error) {
      return {
        responseStatus: AppResponseStatus.FAILURE,
        responseMessage: error.message,
      };
    }
  }
}
