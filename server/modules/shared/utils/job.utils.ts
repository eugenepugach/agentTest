import path from 'path';
import { executeInterpreter, objectToArgsList } from '@/modules/shared/utils/spawn.utils';
import { Logger } from '@/core';
import shortid from 'shortid';
import { FsUtils } from '@flosum/utils';
import { readdir, stat } from 'fs/promises';
import { JOB_LOG_STATE_FILENAME } from '@/constants/job';

export default class JobUtils {
  public static generateJobId(): string {
    return shortid();
  }

  public static runJob(jobPath: string, options: { jobStorePath: string; jobId: string }): Promise<string> {
    return new Promise((resolve, reject) => {
      const { jobStorePath, jobId } = options;

      const childProcess = executeInterpreter(jobPath, ...objectToArgsList({ jobStorePath, jobId }));

      const systemLogger = new Logger(jobId);

      childProcess.once('close', (exitCode: number) => {
        const message = `Job has been closed with status code: ${exitCode}`;

        systemLogger.log(message);

        if (exitCode === 0) {
          resolve(message);
        } else {
          reject(new Error(message));
        }
      });
    });
  }

  public static async getJobsIds(jobsPath: string): Promise<string[]> {
    if (!(await FsUtils.isExistsPath(jobsPath))) {
      return [];
    }

    const jobsDirs = await readdir(jobsPath, { withFileTypes: true });

    const jobsIds = jobsDirs.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

    const jobsIdsWithJobState: string[] = [];

    for (const jobId of jobsIds) {
      const jobStatePath = path.join(jobsPath, jobId, JOB_LOG_STATE_FILENAME);

      if (await FsUtils.isExistsPath(jobStatePath)) {
        jobsIdsWithJobState.push(jobId);
      }
    }

    return jobsIdsWithJobState;
  }

  public static async sortJobsIds(jobStorePath: string, jobsIds: string[]): Promise<string[]> {
    const jobStatToJobId = new Map();

    for (const jobId of jobsIds) {
      const jobStat = await stat(path.join(jobStorePath, jobId));
      jobStatToJobId.set(jobStat, jobId);
    }

    return Array.from(jobStatToJobId.keys())
      .sort((a, b) => b.birthtime - a.birthtime)
      .map((jobStat) => jobStatToJobId.get(jobStat));
  }
}
