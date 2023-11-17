import { rm, readFile } from 'fs/promises';
import { Logger } from '@/core';
import { JobState } from '@data-masking-job/interfaces/logger.interfaces';
import { FsUtils } from '@flosum/utils';
import { RetentionPolicy } from '@/modules/retention-policy/interfaces/retention-policy.interface';
import { JOB_LOG_STATE_FILENAME } from '@/constants/job';
import JobUtils from '@/modules/shared/utils/job.utils';
import { MaskingService } from '@/modules/data-masking/services/masking.service';
import path from 'path';

export class DataMaskingRetentionPolicy implements RetentionPolicy {
  private readonly EXPIRED_RANGE_DATE = 2592000000;
  private readonly logger = new Logger(DataMaskingRetentionPolicy.name);

  public async execute(): Promise<void> {
    try {
      const jobsIds = await JobUtils.getJobsIds(MaskingService.maskingFolderPath);
      const expiredJobs = await this.filterExpiredJobs(jobsIds);

      for (const jobId of expiredJobs) {
        await this.deleteJob(jobId);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async filterExpiredJobs(jobsIds: string[]): Promise<string[]> {
    const expiredIds: string[] = [];

    for (const jobId of jobsIds) {
      const completedDate = await this.getJobCompletedDate(jobId);

      const isExpiredJob = completedDate && this.isExpiredDate(completedDate);

      if (isExpiredJob) {
        expiredIds.push(jobId);
      }
    }

    return expiredIds;
  }

  private async getJobCompletedDate(jobId: string): Promise<number | null> {
    const jobPath = path.join(MaskingService.maskingFolderPath, jobId, JOB_LOG_STATE_FILENAME);

    if (!(await FsUtils.isExistsPath(jobPath))) {
      return null;
    }

    const jobStateJSON = await readFile(jobPath, { encoding: 'utf-8' });

    return (JSON.parse(jobStateJSON) as JobState).completedDate ?? null;
  }

  private isExpiredDate(completedDate: number): boolean {
    return new Date().getTime() - completedDate > this.EXPIRED_RANGE_DATE;
  }

  private deleteJob(jobId: string): Promise<void> {
    const jobPath = path.join(MaskingService.maskingFolderPath, jobId);

    return rm(jobPath, { recursive: true, force: true });
  }
}
