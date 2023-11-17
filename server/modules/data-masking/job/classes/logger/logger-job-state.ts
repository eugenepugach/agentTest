import path from 'path';
import { JobStatus, ObjectStatus } from '@data-masking-job/enums/logger.enums';
import { JobState, ObjectState } from '@data-masking-job/interfaces/logger.interfaces';
import { BaseLogger } from '@data-masking-job/classes/logger/base-logger';
import { readFile, writeFile } from 'fs/promises';
import { jobStorePath } from '@data-masking-job/job-detail';
import { FsUtils } from '@flosum/utils';
import { JOB_LOG_STATE_FILENAME } from '@/constants/job';

export class LoggerJobState extends BaseLogger {
  private _jobState: JobState;

  private _isLoggerInit = false;

  public get isLoggerInit(): boolean {
    return this._isLoggerInit;
  }

  private set isLoggerInit(value) {
    this._isLoggerInit = value;
  }

  private get jobState(): JobState {
    if (!this.isLoggerInit) {
      throw new Error(`Logger Job State wasn't init`);
    }

    return this._jobState;
  }

  private get filePath(): string {
    return path.join(this._jobPath, JOB_LOG_STATE_FILENAME);
  }

  public async init(objects: string[]): Promise<LoggerJobState> {
    this._jobState = await this.getJobState();
    this._jobState.processed = this.initObjectStatistics(objects);

    await this.write();
    await this.start();

    this.isLoggerInit = true;
    return this;
  }

  public setObjectStatus(objectName: string, status: ObjectStatus): void {
    this.getObjectState(objectName).status = status;
    this.updateLoggerState();
  }

  public setJobStatus(status: JobStatus): void {
    this.jobState.status = status;
    if ([JobStatus.FAILED, JobStatus.COMPLETED].includes(status)) {
      this.jobState.completedDate = new Date().getTime();
    }
    this.updateLoggerState();
  }

  public setJobError(error: string): void {
    this.jobState.error = error;
    this.updateLoggerState();
  }

  public updateObjectProcess(objectName: string, successful: number, failed: number): void {
    const objectLog = this.getObjectState(objectName);

    objectLog.successful += successful;
    objectLog.failed += failed;
    this.jobState.successful += successful;
    this.jobState.failed += failed;

    this.updateLoggerState();
  }

  private getObjectState(objectName: string): ObjectState {
    const result = this.jobState.processed?.find((object) => object.name === objectName);
    if (!result) {
      throw new Error(`Cannot find object '${objectName}' in statistic`);
    }
    return result;
  }

  private async getJobState(): Promise<JobState> {
    if (!(await FsUtils.isExistsPath(this.filePath))) {
      return this.initJobState();
    }
    const jobStateJSON = await readFile(`${jobStorePath}/${JOB_LOG_STATE_FILENAME}`, { encoding: 'utf-8' });
    return JSON.parse(jobStateJSON);
  }

  private initJobState(): JobState {
    return {
      id: this._jobId,
      status: JobStatus.QUEUED,
      processed: [],
      createdDate: new Date().getTime(),
      successful: 0,
      failed: 0,
    } as JobState;
  }

  private initObjectStatistics(objects: string[]): ObjectState[] {
    return objects.map((objectName) => ({
      name: objectName,
      status: ObjectStatus.QUEUED,
      failed: 0,
      successful: 0,
    }));
  }

  protected write(): Promise<void> {
    return writeFile(this.filePath, JSON.stringify(this._jobState));
  }
}
