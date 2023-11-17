import minimist from 'minimist';
import { Logger as SystemLogger } from '@/core';
import { AxiosInstanceUtils, RestSimpleDeployData, SFRecord } from '@flosum/salesforce';
import { AuthManager } from '@/modules/shared/managers/auth.manager';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';
import { pipeline } from 'stream/promises';
import { AuthDetails } from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';
import { AxiosInstance } from 'axios';
import { readFile, rm } from 'fs/promises';
import path from 'path';
import { TrackingMetadataManifest } from '@/modules/tracking-metadata/job/interfaces/job.interfaces';
import { MetadataRetriever } from '@/modules/tracking-metadata/job/classes/metadata.retriever';
import { ComponentsDeployer } from '@/modules/tracking-metadata/job/classes/components.deployer';
import { SourceMemberRetriever } from '@/modules/tracking-metadata/job/classes/source-member.retriever';
import { SourceMemberHandler } from '@/modules/tracking-metadata/job/classes/source-member.handler';
import { MetadataLogger } from '@/modules/tracking-metadata/job/classes/metadata-logger';
import { MANIFEST_FILENAME } from '@/constants/job';
import { FLOSUM_NAMESPACE } from '@/constants';
import { LogStatus } from '@/modules/tracking-metadata/constants';

const { jobId, jobStorePath } = minimist(process.argv.slice(2));
const systemLogger = new SystemLogger(jobId);

export class Job {
  private readonly jobId: string;
  private readonly jobStorePath: string;

  private startDate: number;
  private apiVersion: string;
  private flosumOrgCredentials: AuthDetails;
  private targetOrgCredentials: AuthDetails;
  private targetOrgId: string;
  private trackingSettingId: string;
  private lastRetrieveDate: string;
  private metadataTypes: string[];
  private metadataLogId: string;
  private timeZone: string;

  private flosumInstance: AxiosInstance;
  private targetInstance: AxiosInstance;
  private logger: Logger;
  private metadataLogger: MetadataLogger;

  constructor() {
    this.jobStorePath = jobStorePath;
    this.jobId = jobId;
  }

  private async initManifest(): Promise<void> {
    const manifestPath = path.join(this.jobStorePath, MANIFEST_FILENAME);

    const manifest: TrackingMetadataManifest = await readFile(manifestPath, { encoding: 'utf-8' })
      .then(JSON.parse)
      .then(({ details }) => details);

    await rm(manifestPath, { recursive: true, force: true });

    this.apiVersion = manifest.apiVersion;
    this.flosumOrgCredentials = manifest.flosumOrgCredentials;
    this.targetOrgCredentials = manifest.targetOrgCredentials;
    this.targetOrgId = manifest.targetOrgId;
    this.trackingSettingId = manifest.trackingSettingId;
    this.lastRetrieveDate = manifest.lastRetrieveDate;
    this.metadataTypes = manifest.metadataTypes;
    this.timeZone = manifest.timeZone;
  }

  private async initInstances(): Promise<void> {
    this.flosumInstance = await AxiosInstanceUtils.create(new AuthManager(this.flosumOrgCredentials), [], {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    this.targetInstance = await AxiosInstanceUtils.create(new AuthManager(this.targetOrgCredentials), [], {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  private async initMetadataLogger(): Promise<void> {
    this.metadataLogger = new MetadataLogger({
      apiVersion: this.apiVersion,
      instance: this.flosumInstance,
      targetOrgId: this.targetOrgId,
      trackingSettingId: this.trackingSettingId,
      startDate: this.startDate,
    });
    this.metadataLogId = await this.metadataLogger.init();
  }

  private initLogger(): void {
    this.logger = new Logger({
      systemLogger,
      apiVersion: this.apiVersion,
      instance: this.flosumInstance,
      metadataLogId: this.metadataLogId,
      timeZone: this.timeZone,
    });
  }

  private getSourceMemberRetriever(): SourceMemberRetriever {
    return new SourceMemberRetriever({
      apiVersion: this.apiVersion,
      instance: this.targetInstance,
      logger: this.logger,
      lastRetrieveDate: this.lastRetrieveDate,
      currentRetrieveDate: this.startDate,
      metadataTypes: this.metadataTypes,
    });
  }

  private getSourceMemberHandler(): SourceMemberHandler {
    return new SourceMemberHandler({
      instance: this.flosumInstance,
      apiVersion: this.apiVersion,
      logger: this.logger,
      targetOrgId: this.targetOrgId,
    });
  }

  private getMetadataRetriever(): MetadataRetriever {
    return new MetadataRetriever({
      instance: this.targetInstance,
      apiVersion: this.apiVersion,
      logger: this.logger,
      metadataTypes: this.metadataTypes,
    });
  }

  private getComponentsDeployer(): ComponentsDeployer {
    return new ComponentsDeployer({
      instance: this.flosumInstance,
      logger: this.logger,
      apiVersion: this.apiVersion,
      targetOrgId: this.targetOrgId,
      trackingSettingId: this.trackingSettingId,
    });
  }

  private createTrackingSettingRecord(): SFRecord {
    return {
      attributes: { type: `${FLOSUM_NAMESPACE}Tracking_Setting__c` },
      Id: this.trackingSettingId,
      [`${FLOSUM_NAMESPACE}Is_Processed__c`]: false,
      [`${FLOSUM_NAMESPACE}Last_Start_Retrieval__c`]: this.startDate,
    };
  }

  private async updateTrackingSetting(): Promise<void> {
    const record = this.createTrackingSettingRecord();

    const deployer = new RestSimpleDeployData({
      instance: this.flosumInstance,
      objectName: `${FLOSUM_NAMESPACE}Tracking_Setting__c`,
      api: this.apiVersion,
      allOrNone: false,
      externalIdField: 'Id',
    });

    const deployDataResult = await deployer.execute({ records: [record] });
    const result = deployDataResult.at(0);
    if (result?.success) {
      this.logger.log('Tracking setting updated');
    } else {
      this.logger.log(`Tracking setting not updated \n ${result?.error}`);
    }
  }

  public async execute(): Promise<void> {
    await this.initManifest();
    this.startDate = new Date().getTime();

    try {
      await this.initInstances();
      await this.initMetadataLogger();
      this.initLogger();

      this.logger.log(`Tracking components job has been started with id: ${this.jobId}`);
      this.metadataLogger.status = LogStatus.IN_PROGRESS;
      await this.metadataLogger.update();
      await this.logger.update();

      const sourceMemberRetriever = this.getSourceMemberRetriever();
      const sourceMemberHandler = this.getSourceMemberHandler();
      const metadataHandler = this.getMetadataRetriever();
      const componentsDeployer = this.getComponentsDeployer();

      await pipeline(sourceMemberRetriever, sourceMemberHandler, metadataHandler, componentsDeployer);

      this.logger.log('Tracking components job has been completed');
      this.metadataLogger.status = LogStatus.COMPLETED;
    } catch (error) {
      this.logger.error('Tracking components job has been failed');
      this.logger.error(error.message);
      this.metadataLogger.status = LogStatus.EXCEPTION;
    } finally {
      await this.updateTrackingSetting();
      await this.logger.update();
      await this.metadataLogger.update();
    }
  }
}

new Job()
  .execute()
  .then(() => process.exit(0))
  .catch((error) => {
    systemLogger.error(`Job Error: ${error.message}`);
    process.exit(1);
  });
