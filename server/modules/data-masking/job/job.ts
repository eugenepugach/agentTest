import { readFile, rm, writeFile } from 'fs/promises';
import { MaskingManifest, ObjectRule } from '@data-masking-job/interfaces/job.interfaces';
import { AxiosInstanceUtils, ManagerAutomationProcess, ManagerAutomationProcessOptions } from '@flosum/salesforce';
import { StepsCreator } from '@data-masking-job/classes/step/steps-creator';
import { JobStatus } from '@data-masking-job/enums/logger.enums';
import { AxiosInstance } from 'axios';
import { LoggerDetails } from '@data-masking-job/classes/logger/logger-details';
import { LoggerJobState } from '@data-masking-job/classes/logger/logger-job-state';
import { MANIFEST_FILENAME } from '@/constants/job';
import path from 'path';
import { AuthManager } from '@/modules/shared/managers/auth.manager';
import { AUTOMATION_PROCESS_METADATA_BACKUP_FILENAME } from '@/modules/data-masking/constants';
import { jobId, jobStorePath, systemLogger } from '@data-masking-job/job-detail';
import { BaseStep } from '@data-masking-job/classes/step/base-step';

export class MaskingJob {
  private _loggerDetails: LoggerDetails;
  private _loggerJobState: LoggerJobState;
  private _maskingManifest: MaskingManifest;
  private _request: AxiosInstance;
  private _managerAutomationProcess: ManagerAutomationProcess;
  private _steps: BaseStep[];
  private _isEnableAutomationProcessError = false;

  private async initAutomationProcess(): Promise<void> {
    const { objectRules } = this._maskingManifest;

    this._managerAutomationProcess = new ManagerAutomationProcess(this.getManagerAutomationProcessOptions(objectRules));
  }

  private async masking(): Promise<void> {
    systemLogger.log('Start Masking Process');
    this._loggerDetails.log('Start Masking Process');

    const { objectRules, libraries } = this._maskingManifest;

    this._steps = await new StepsCreator({
      loggerDetails: this._loggerDetails,
      loggerJobState: this._loggerJobState,
      libraries,
      objectRules,
      request: this._request,
    }).create();

    for (const step of this._steps) {
      await step.execute();
    }
  }

  private getManagerAutomationProcessOptions(objectRules: Record<string, ObjectRule>): ManagerAutomationProcessOptions {
    const triggersObjects: string[] = [];
    const workflowsObjects: string[] = [];
    const processBuilderObjects: string[] = [];
    const validationRulesObjects: string[] = [];

    for (const objectName in objectRules) {
      const { isDisableProcessBuilder, isDisableTrigger, isDisableValidationRule, isDisableWorkflow } =
        objectRules[objectName].disableAutomation;

      if (isDisableProcessBuilder) {
        processBuilderObjects.push(objectName);
      }
      if (isDisableTrigger) {
        triggersObjects.push(objectName);
      }
      if (isDisableValidationRule) {
        validationRulesObjects.push(objectName);
      }
      if (isDisableWorkflow) {
        workflowsObjects.push(objectName);
      }
    }

    return {
      instance: this._request,
      saveSourceMetadataBackup: this.saveSourceAutomationProcessesBackup,
      triggersObjects,
      workflowsObjects,
      processBuilderObjects,
      validationRulesObjects,
    } as ManagerAutomationProcessOptions;
  }

  private async disableAutomationProcess(): Promise<void> {
    systemLogger.log('Disable automation process');
    this._loggerDetails.log('Disable automation process');
    await this._managerAutomationProcess.disable();
  }

  private async enableAutomationProcess(): Promise<void> {
    if (!this._isEnableAutomationProcessError) {
      systemLogger.log('Enable automation process');
      this._loggerDetails.log('Enable automation process');
      await this._managerAutomationProcess.enable().catch((error) => {
        this._isEnableAutomationProcessError = true;
        throw error;
      });
    }
  }

  private async getManifest(): Promise<MaskingManifest> {
    const message = await readFile(path.join(jobStorePath, MANIFEST_FILENAME), { encoding: 'utf-8' });
    await rm(path.join(jobStorePath, MANIFEST_FILENAME), { recursive: true, force: true });
    return JSON.parse(message).details;
  }

  private saveSourceAutomationProcessesBackup(base64: string): Promise<void> {
    return writeFile(
      path.join(jobStorePath, AUTOMATION_PROCESS_METADATA_BACKUP_FILENAME),
      Buffer.from(base64, 'base64')
    );
  }

  public async execute(): Promise<void> {
    this._maskingManifest = await this.getManifest();
    const { objectRules, credentials } = this._maskingManifest;

    this._loggerDetails = await new LoggerDetails(jobStorePath, jobId).init();
    this._loggerJobState = await new LoggerJobState(jobStorePath, jobId).init(Object.keys(objectRules));

    try {
      this._loggerJobState.setJobStatus(JobStatus.IN_PROGRESS);

      this._request = await AxiosInstanceUtils.create(new AuthManager(credentials), [], {
        headers: { 'Accept-Encoding': 'gzip' },
      });

      await this.initAutomationProcess();

      await this.disableAutomationProcess();
      await this.masking();
      await this.enableAutomationProcess();

      this._loggerJobState.setJobStatus(JobStatus.COMPLETED);
    } catch (error) {
      await this.enableAutomationProcess().catch((error: Error) => {
        systemLogger.error(error.message);
      });

      this._loggerDetails.exception(error.message);
      this._loggerJobState.setJobStatus(JobStatus.FAILED);
      this._loggerJobState.setJobError(error.message);
      systemLogger.error(error.message);
    } finally {
      this._loggerDetails.log('Finish Masking Process');
      systemLogger.log('Finish Masking Process');

      await this._loggerJobState.kill();
      await this._loggerDetails.kill();
    }
  }
}

new MaskingJob()
  .execute()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
