import JobUtils from '@/modules/shared/utils/job.utils';
import path from 'path';
import {
  CreateRetrieveJobResult,
  RetrieveMetadataBody,
  RetrieveMetadataJobLogsResult,
  RetrieveMetadataResult,
} from '@/modules/retrieve-metadata/interfaces/retrieve-metadata.interfaces';
import ManifestManager from '@retrieve-metadata-job/classes/manifest-manger';
import StateManager from '@/modules/shared/managers/state-manger';
import { readFile } from 'fs/promises';
import { FsUtils } from '@flosum/utils';
import CsvUtils from '@/modules/shared/utils/csv.utils';
import { NotFoundError } from '@/core/errors/not-found.error';
import { JobStatus } from '@/modules/shared/enums/logger.enums';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { JobState } from '@/modules/shared/interfaces/job.interfaces';
import { JOB_LOG_DETAILS_FILENAME, JOB_PATH } from '@/constants/job';
import { makeDir } from '@/modules/shared/utils/fs.utils';
import {
  RETRIEVE_METADATA_FOLDER_NAME,
  RETRIEVE_RESULT_FOLDER_NAME,
  RETRIEVE_RESULTS_IDS_FILENAME,
} from '@/modules/retrieve-metadata/constants';
import { dataPath } from '@/configs/path';

export default class RetrieveMetadataService {
  private static retrieveMetadataFolder: string = path.join(dataPath, RETRIEVE_METADATA_FOLDER_NAME);

  public static async getJobs(limit: number, offset: number) {
    const jobsIds = await JobUtils.getJobsIds(RetrieveMetadataService.retrieveMetadataFolder);

    const sortedJobsIds = await JobUtils.sortJobsIds(RetrieveMetadataService.retrieveMetadataFolder, jobsIds);

    const croppedJobsIds = sortedJobsIds.slice(offset, offset + limit);

    const jobStates: JobState[] = [];

    for (const jobId of croppedJobsIds) {
      const jobState = await StateManager.getJobState(path.join(RetrieveMetadataService.retrieveMetadataFolder, jobId));
      jobStates.push(jobState);
    }

    return jobStates;
  }

  public static async createRetrieveJob(details: RetrieveMetadataBody): Promise<CreateRetrieveJobResult> {
    const jobId = JobUtils.generateJobId();
    const jobStorePath = path.join(RetrieveMetadataService.retrieveMetadataFolder, jobId);

    await makeDir(jobStorePath);

    await ManifestManager.create(jobStorePath, details);
    await StateManager.create(jobStorePath, jobId);

    const jobPath = path.join(__dirname, JOB_PATH);

    JobUtils.runJob(jobPath, { jobStorePath, jobId }).catch(async (error) => {
      const stateManager = new StateManager(jobStorePath);
      await stateManager.init();
      await stateManager.setError(error);
    });

    return { jobId };
  }

  public static async getResult(jobId: string): Promise<string[]> {
    const { status } = await RetrieveMetadataService.getJobStatus(jobId);

    if (status === JobStatus.IN_PROGRESS) {
      throw new BadRequestError('Job not completed.');
    }

    const jobResultsIdsPath = path.join(
      RetrieveMetadataService.retrieveMetadataFolder,
      jobId,
      RETRIEVE_RESULTS_IDS_FILENAME
    );

    if (await FsUtils.isExistsPath(jobResultsIdsPath)) {
      return readFile(jobResultsIdsPath, 'utf-8').then(JSON.parse);
    } else {
      throw new NotFoundError('Result not found.');
    }
  }

  public static async getResultChunk(jobId: string, chunkId: string): Promise<RetrieveMetadataResult> {
    const { status } = await RetrieveMetadataService.getJobStatus(jobId);

    if (status === JobStatus.IN_PROGRESS) {
      throw new BadRequestError('Job not completed.');
    }

    const jobChunksPath = path.join(RetrieveMetadataService.retrieveMetadataFolder, jobId, RETRIEVE_RESULT_FOLDER_NAME);

    const result: RetrieveMetadataResult = {
      data: [],
    };

    if (await FsUtils.isExistsPath(path.join(jobChunksPath, `${chunkId}.json`))) {
      result.data = await readFile(path.join(jobChunksPath, `${chunkId}.json`), 'utf-8').then(JSON.parse);
    } else {
      throw new NotFoundError('Chunk not found.');
    }

    return result;
  }

  public static async getJobStatus(jobId: string): Promise<JobState> {
    try {
      return await StateManager.getJobState(path.join(RetrieveMetadataService.retrieveMetadataFolder, jobId));
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public static async getJobLogs(jobId: string): Promise<RetrieveMetadataJobLogsResult> {
    const jobLogPath = path.join(RetrieveMetadataService.retrieveMetadataFolder, jobId, JOB_LOG_DETAILS_FILENAME);

    if (await FsUtils.isExistsPath(jobLogPath)) {
      return readFile(jobLogPath, 'utf-8').then((data: string) => CsvUtils.parse(data, { columns: true }));
    }

    throw new NotFoundError('Job log not found.');
  }
}
