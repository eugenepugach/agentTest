import { MaskingManifest } from '@data-masking-job/interfaces/job.interfaces';
import path, { join } from 'path';
import { makeDir } from '@/modules/shared/utils/fs.utils';
import { readFile, writeFile } from 'fs/promises';
import { LoggerJobState } from '@data-masking-job/classes/logger/logger-job-state';
import { JobStatus } from '@data-masking-job/enums/logger.enums';
import { JobState, LogMessage } from '@data-masking-job/interfaces/logger.interfaces';
import { parse as csvParse } from 'csv-parse/sync';
import { FsUtils } from '@flosum/utils';
import { NotFoundError } from '@/core/errors/not-found.error';
import { JOB_LOG_DETAILS_FILENAME, JOB_LOG_STATE_FILENAME, JOB_PATH, MANIFEST_FILENAME } from '@/constants/job';
import JobUtils from '@/modules/shared/utils/job.utils';
import { DATA_MASKING_FOLDER_NAME, JOB_LOG_DETAILS_NAME, JOB_LOG_STATE_NAME } from '@/modules/data-masking/constants';
import { dataPath } from '@/configs/path';

export class MaskingService {
  public static maskingFolderPath: string = path.join(dataPath, DATA_MASKING_FOLDER_NAME);

  public static async createMaskingJob(details: MaskingManifest): Promise<{ jobId: string }> {
    const jobId = JobUtils.generateJobId();
    const jobStorePath = join(MaskingService.maskingFolderPath, jobId);

    await makeDir(jobStorePath);
    await writeFile(`${jobStorePath}/${MANIFEST_FILENAME}`, JSON.stringify({ details }));

    const loggerJobState = await new LoggerJobState(jobStorePath, jobId).init([]);
    await loggerJobState.kill();

    const jobPath = path.join(__dirname, JOB_PATH);

    JobUtils.runJob(jobPath, {
      jobStorePath,
      jobId,
    }).catch((error) => this.logErrorStartJob(jobStorePath, jobId, error));

    return { jobId };
  }

  public static async getJobs(limit: number, offset: number): Promise<JobState[]> {
    const jobsIds = await JobUtils.getJobsIds(MaskingService.maskingFolderPath);
    const sortedJobsIds = await JobUtils.sortJobsIds(MaskingService.maskingFolderPath, jobsIds);

    const croppedJobsIds = sortedJobsIds.slice(offset, offset + limit);

    const jobStates: JobState[] = [];

    for (const jobId of croppedJobsIds) {
      const jobState = await this.getJobState(jobId, false);
      jobStates.push(jobState);
    }

    return jobStates;
  }

  public static async getJobState(jobId: string, includeDetails: boolean): Promise<JobState> {
    const jobStateJSON = await this.getLog(jobId, JOB_LOG_STATE_FILENAME, JOB_LOG_STATE_NAME);

    const jobState: JobState = JSON.parse(jobStateJSON);
    const jobStateShort: JobState = {
      id: jobState.id,
      status: jobState.status,
      createdDate: jobState.createdDate,
      completedDate: jobState.completedDate,
      successful: jobState.successful,
      failed: jobState.failed,
    };

    return includeDetails ? jobState : jobStateShort;
  }

  public static async getJobDetails(jobId: string): Promise<LogMessage[]> {
    const jobDetailsJSON = await this.getLog(jobId, JOB_LOG_DETAILS_FILENAME, JOB_LOG_DETAILS_NAME);
    return csvParse(jobDetailsJSON, { columns: true });
  }

  private static async getLog(jobId: string, fileName: string, logName: string): Promise<string> {
    const jobPath = join(MaskingService.maskingFolderPath, jobId);
    const logPath = join(jobPath, fileName);

    if (!(await FsUtils.isExistsPath(jobPath))) {
      throw new NotFoundError('Job Id not found.');
    }

    if (!(await FsUtils.isExistsPath(logPath))) {
      throw new NotFoundError(`${logName} not found.`);
    }

    return readFile(logPath, { encoding: 'utf-8' });
  }

  private static async logErrorStartJob(jobStorePath: string, jobId: string, error: Error): Promise<void> {
    const loggerJobState = await new LoggerJobState(jobStorePath, jobId).init([]);
    loggerJobState.setJobStatus(JobStatus.FAILED);
    loggerJobState.setJobError(error.message);
    await loggerJobState.kill();
  }
}
