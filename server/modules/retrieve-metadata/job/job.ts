import minimist from 'minimist';
import StateManager from '@/modules/shared/managers/state-manger';
import { Logger as SystemLogger } from '@/core';
import Logger from '@retrieve-metadata-job/classes/logger';
import RetrieveMetadata from '@retrieve-metadata-job/classes/retrieve-metadata';

export class Job {
  private readonly jobId: string;
  private readonly jobStorePath: string;

  constructor() {
    const { jobId, jobStorePath } = minimist(process.argv.slice(2));

    this.jobStorePath = jobStorePath;
    this.jobId = jobId;
  }

  public async execute(): Promise<void> {
    const systemLogger = new SystemLogger(this.jobId);
    const logger = new Logger(this.jobId, systemLogger);

    const stateManager = await new StateManager(this.jobStorePath).init();

    await logger.log('Retrieve metadata job has been started');

    try {
      await stateManager.setInProgress();

      await new RetrieveMetadata(this.jobStorePath, logger, stateManager).execute();

      await stateManager.setCompleted();

      await logger.log('Retrieve metadata job has been completed');
    } catch (error) {
      await stateManager.setError(error);

      await logger.error('Retrieve metadata job has been failed');
      await logger.error(error.message);
    }
  }
}

new Job()
  .execute()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
