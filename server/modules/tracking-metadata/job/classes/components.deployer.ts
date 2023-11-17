import {
  BinaryContent,
  CompositeBinaryData,
  CompositeBinaryDeployData,
  CompositeConstants,
  DeployDataResult,
  ListMetadataItem,
  SFRecord,
  RestSimpleDeployData,
} from '@flosum/salesforce';
import {
  METADATA_FOLDER_MAP,
  ORG_COMPONENT_OBJECT_NAME,
  BINARY_FIELD_NAME,
  ATTACHMENT_OBJECT_NAME,
} from '@/modules/tracking-metadata/constants';
import {
  BaseOptions,
  MetadataRetrieverRecord,
  SourceMemberData,
} from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';
import { Readable, Writable } from 'stream';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';
import JSZip from 'jszip';
import { FLOSUM_NAMESPACE } from '@/constants';

const MAX_COMPOSITE_CHUNK_COUNT = 200;
const EXTERNAL_ID_FIELD = 'Id';
const ATTACHMENT_FIELD_NAME = `${FLOSUM_NAMESPACE}Attachment_ID__c`;
const CONTENT_TYPE = 'application/zip';

export interface ComponentsDeployerOptions extends BaseOptions {
  logger: Logger;
  targetOrgId: string;
  trackingSettingId: string;
}

export class ComponentsDeployer extends Writable {
  private readonly apiVersion: ComponentsDeployerOptions['apiVersion'];
  private readonly instance: ComponentsDeployerOptions['instance'];
  private readonly logger: ComponentsDeployerOptions['logger'];
  private readonly targetOrgId: ComponentsDeployerOptions['targetOrgId'];
  private readonly trackingSettingId: ComponentsDeployerOptions['trackingSettingId'];

  private attachmentsToDeployChunk: CompositeBinaryData = { records: [], binary: [] };
  private binaryRecordsSizeChunk: number = 0;

  private orgComponentsToDeployChunk: SFRecord[] = [];
  private successDeployedCounter: number = 0;

  constructor({ apiVersion, instance, logger, targetOrgId, trackingSettingId }: ComponentsDeployerOptions) {
    super({ objectMode: true });

    this.apiVersion = apiVersion;
    this.instance = instance;
    this.logger = logger;
    this.targetOrgId = targetOrgId;
    this.trackingSettingId = trackingSettingId;
  }

  private async deploy(): Promise<void> {
    await this.deployAttachments()
      .then((result) => this.populateAttachmentId(result))
      .then(() => this.deployOrgComponents())
      .then((result) => this.handleDeployResult(result));

    this.resetChunks();
  }

  private deployAttachments(): Promise<DeployDataResult[]> {
    const deployer = new CompositeBinaryDeployData({
      instance: this.instance,
      objectName: ATTACHMENT_OBJECT_NAME,
      externalIdField: EXTERNAL_ID_FIELD,
      allOrNone: false,
      api: this.apiVersion,
    });

    return deployer.execute(this.attachmentsToDeployChunk);
  }

  private deployOrgComponents(): Promise<DeployDataResult[]> {
    const deployer = new RestSimpleDeployData({
      instance: this.instance,
      objectName: ORG_COMPONENT_OBJECT_NAME,
      api: this.apiVersion,
      allOrNone: false,
      externalIdField: 'Id',
    });

    return deployer.execute({ records: this.orgComponentsToDeployChunk });
  }

  private async handleDeployResult(deployResult: DeployDataResult[]): Promise<void> {
    for (const { success, error } of deployResult) {
      if (success) {
        this.successDeployedCounter++;
        continue;
      }

      if (error) {
        this.logger.error(error);
      }
    }
  }

  private isReachedMaxChunk(binarySize: number): boolean {
    return (
      binarySize + this.binaryRecordsSizeChunk >= CompositeConstants.MAX_BODY_SIZE ||
      this.attachmentsToDeployChunk.records.length === MAX_COMPOSITE_CHUNK_COUNT
    );
  }

  private resetChunks(): void {
    this.binaryRecordsSizeChunk = 0;
    this.attachmentsToDeployChunk = { records: [], binary: [] };

    this.orgComponentsToDeployChunk = [];
  }

  private populateAttachmentId(deployResult: DeployDataResult[]): void {
    for (const index in deployResult) {
      this.orgComponentsToDeployChunk[index][ATTACHMENT_FIELD_NAME] = deployResult[index].id;
    }
  }

  private async addAttachmentToChunk(data: MetadataRetrieverRecord, zipBuffer: Buffer): Promise<void> {
    const { listMetadataItem, sourceMemberRecord } = data;

    const dist = {
      attributes: {
        type: ATTACHMENT_OBJECT_NAME,
        binaryPartName: listMetadataItem.fullName,
        binaryPartNameAlias: BINARY_FIELD_NAME,
      },
      Id: sourceMemberRecord.attachmentId,
      Name: listMetadataItem.fullName,
      Description: listMetadataItem.type,
      ContentType: CONTENT_TYPE,
      ParentId: this.targetOrgId,
      Body: listMetadataItem.fullName,
    };

    const binaryContent: BinaryContent = {
      binaryFieldName: BINARY_FIELD_NAME,
      name: listMetadataItem.fullName,
      value: Readable.from(zipBuffer),
    };

    this.attachmentsToDeployChunk.records.push(dist);
    this.attachmentsToDeployChunk.binary.push(binaryContent);
  }

  private createZip(files: Record<string, Buffer>): Promise<Buffer> {
    const zip = new JSZip();

    for (const filePath in files) {
      zip.file(filePath, files[filePath]);
    }

    return zip.generateAsync({ type: 'nodebuffer' });
  }

  private addOrgComponentToChunk(listMetadataItem: ListMetadataItem, sourceMemberRecord: SourceMemberData): void {
    const record: SFRecord = {
      attributes: { type: ORG_COMPONENT_OBJECT_NAME },
      Id: sourceMemberRecord.componentId,
      [`${FLOSUM_NAMESPACE}Is_Deleted__c`]: sourceMemberRecord.isNameObsolete,
      [`${FLOSUM_NAMESPACE}Revision_Counter__c`]: sourceMemberRecord.revisionCounter,
      [`${FLOSUM_NAMESPACE}Source_Member_Id__c`]: sourceMemberRecord.sourceMemberId,
      [`${FLOSUM_NAMESPACE}Last_Updated_By__c`]: sourceMemberRecord.changedBy,
      [`${FLOSUM_NAMESPACE}API_Name__c`]: listMetadataItem.fullName,
      [`${FLOSUM_NAMESPACE}Name__c`]: listMetadataItem.fullName,
      [`${FLOSUM_NAMESPACE}Component_Type__c`]: listMetadataItem.type,
      [`${FLOSUM_NAMESPACE}Label__c`]: listMetadataItem.fileName,
      [`${FLOSUM_NAMESPACE}Folder__c`]: METADATA_FOLDER_MAP.has(listMetadataItem.type) || null,
      [`${FLOSUM_NAMESPACE}Is_Retrieved__c`]: true,
      [`${FLOSUM_NAMESPACE}OrganisationName__c`]: this.targetOrgId,
      [`${FLOSUM_NAMESPACE}Tracking_Setting__c`]: this.trackingSettingId,
      [`${FLOSUM_NAMESPACE}Status__c`]: 'Retrieved',
    };

    this.orgComponentsToDeployChunk.push(record);
  }

  public async _write(
    data: MetadataRetrieverRecord,
    _: BufferEncoding,
    callback: (error?: Error) => void
  ): Promise<void> {
    try {
      const { listMetadataItem, sourceMemberRecord, files } = data;

      const zipBuffer = await this.createZip(files);
      const binarySize = Buffer.byteLength(zipBuffer);

      if (this.isReachedMaxChunk(binarySize)) {
        await this.deploy();
      }

      this.binaryRecordsSizeChunk += binarySize;
      await this.addAttachmentToChunk(data, zipBuffer);
      this.addOrgComponentToChunk(listMetadataItem, sourceMemberRecord);

      callback();
    } catch (error) {
      callback(error);
    }
  }

  public async _final(callback: (error?: Error | null) => void): Promise<void> {
    try {
      if (this.attachmentsToDeployChunk.records.length && this.orgComponentsToDeployChunk.length) {
        await this.deploy();
      }

      this.logger.log(`Process completed for ${this.successDeployedCounter} components`);
      await this.logger.update();

      callback();
    } catch (error) {
      callback(error);
    }
  }
}
