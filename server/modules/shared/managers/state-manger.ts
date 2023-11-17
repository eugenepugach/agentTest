import { JobStatus } from '@/modules/shared/enums/logger.enums';
import { JobState } from '@/modules/shared/interfaces/job.interfaces';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { FsUtils } from '@flosum/utils';
import { JOB_LOG_STATE_FILENAME } from '@/constants/job';

export default class StateManager {
  private jobState: JobState;
  private readonly statePath: string;

  constructor(jobStorePath: string) {
    this.statePath = StateManager.getJobStatePath(jobStorePath);
  }

  private static getJobStatePath(jobStorePath: string): string {
    return path.join(jobStorePath, JOB_LOG_STATE_FILENAME);
  }

  public static async create(jobStorePath: string, jobId: string): Promise<void> {
    const statePath = StateManager.getJobStatePath(jobStorePath);

    const defaultState: JobState = {
      id: jobId,
      status: JobStatus.QUEUED,
      createdDate: null,
      completedDate: null,
      error: null,
      warnings: [],
    };

    await writeFile(statePath, JSON.stringify(defaultState));
  }

  public static async getJobState(jobStorePath: string): Promise<JobState> {
    const statePath = StateManager.getJobStatePath(jobStorePath);

    if (await FsUtils.isExistsPath(statePath)) {
      return readFile(statePath, 'utf-8').then(JSON.parse);
    }

    throw new Error('Job not found.');
  }

  private async update(): Promise<void> {
    await writeFile(this.statePath, JSON.stringify(this.jobState));
  }

  public async init(): Promise<StateManager> {
    this.jobState = await readFile(this.statePath, 'utf-8').then(JSON.parse);
    return this;
  }

  public async setInProgress(): Promise<void> {
    this.jobState.status = JobStatus.IN_PROGRESS;
    this.jobState.createdDate = new Date().getTime();

    await this.update();
  }

  public async setCompleted(): Promise<void> {
    this.jobState.status = JobStatus.COMPLETED;
    this.jobState.completedDate = new Date().getTime();

    await this.update();
  }

  public async setError({ message }: Error): Promise<void> {
    this.jobState.status = JobStatus.FAILED;
    this.jobState.completedDate = new Date().getTime();
    this.jobState.error = message;

    await this.update();
  }

  public addWarning(message: string): Promise<void> {
    this.jobState.warnings.push(message);
    return this.update();
  }
}
