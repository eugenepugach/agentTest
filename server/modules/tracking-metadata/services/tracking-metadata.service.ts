import JobUtils from '@/modules/shared/utils/job.utils';
import path from 'path';
import { makeDir } from '@/modules/shared/utils/fs.utils';
import { JOB_PATH, MANIFEST_FILENAME } from '@/constants/job';
import {
  TrackingMetadataBody,
  TrackingMetadataJobResult,
} from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';
import { dataPath } from '@/configs/path';
import { TRACKING_METADATA_FOLDER_NAME } from '@/modules/tracking-metadata/constants';
import { writeFile } from 'fs/promises';
import { TrackingMetadataManifest } from '@/modules/tracking-metadata/job/interfaces/job.interfaces';
import { Logger as SystemLogger } from '@/core';

export class TrackingMetadataService {
  private static trackingMetadataFolder: string = path.join(dataPath, TRACKING_METADATA_FOLDER_NAME);

  public static async createJob(details: TrackingMetadataBody): Promise<TrackingMetadataJobResult> {
    const jobId = JobUtils.generateJobId();
    const jobStorePath = path.join(TrackingMetadataService.trackingMetadataFolder, jobId);

    await makeDir(jobStorePath);

    await this.createManifest(jobStorePath, details);

    const jobPath = path.join(__dirname, JOB_PATH);

    const systemLogger = new SystemLogger(jobId);
    JobUtils.runJob(jobPath, { jobStorePath, jobId }).catch(async (error) => {
      systemLogger.error(error);
    });

    return { jobId };
  }

  public static async createManifest(jobStorePath: string, details: TrackingMetadataManifest) {
    const manifestPath = this.getManifestPath(jobStorePath);
    return writeFile(manifestPath, JSON.stringify({ details }));
  }

  private static getManifestPath(jobStorePath: string): string {
    return path.join(jobStorePath, MANIFEST_FILENAME);
  }
}
