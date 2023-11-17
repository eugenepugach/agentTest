import { Logger as SystemLogger } from '@/core';
import { ATTACHMENT_OBJECT_NAME, BINARY_FIELD_NAME } from '@/modules/tracking-metadata/constants';
import { BinaryContent, CompositeBinaryData, CompositeBinaryDeployData, DeployDataResult } from '@flosum/salesforce';
import { Readable } from 'stream';
import { MetadataLoggerOptions } from '@/modules/tracking-metadata/job/classes/metadata-logger';
import { AxiosInstance } from 'axios';

const EXTERNAL_ID_FIELD = 'Id';
const CONTENT_TYPE = 'text/plain';
const TRACKING_ORGANIZATION_LOG_NAME = 'Tracking Organization Log';

export interface LoggerOptions {
  systemLogger: SystemLogger;
  apiVersion: string;
  instance: AxiosInstance;
  metadataLogId: string;
  timeZone: string;
}

export class Logger {
  private readonly apiVersion: MetadataLoggerOptions['apiVersion'];
  private readonly instance: MetadataLoggerOptions['instance'];
  private readonly systemLogger: LoggerOptions['systemLogger'];
  private readonly metadataLogId: LoggerOptions['metadataLogId'];
  private readonly timeZone: LoggerOptions['timeZone'];

  private messages: string[] = [];
  private attachmentId: string;

  constructor({ systemLogger, apiVersion, instance, metadataLogId }: LoggerOptions) {
    this.systemLogger = systemLogger;
    this.apiVersion = apiVersion;
    this.instance = instance;
    this.metadataLogId = metadataLogId;
  }

  private async createAttachment(): Promise<CompositeBinaryData> {
    const dist = {
      attributes: {
        type: ATTACHMENT_OBJECT_NAME,
        binaryPartName: TRACKING_ORGANIZATION_LOG_NAME,
        binaryPartNameAlias: BINARY_FIELD_NAME,
      },
      Id: this.attachmentId || null,
      Name: TRACKING_ORGANIZATION_LOG_NAME,
      ContentType: CONTENT_TYPE,
      ParentId: this.metadataLogId,
      Body: TRACKING_ORGANIZATION_LOG_NAME,
    };

    const binaryContent: BinaryContent = {
      binaryFieldName: BINARY_FIELD_NAME,
      name: TRACKING_ORGANIZATION_LOG_NAME,
      value: Readable.from(this.messages),
    };

    return {
      records: [dist],
      binary: [binaryContent],
    };
  }

  private async deployAttachment(data: CompositeBinaryData): Promise<DeployDataResult[]> {
    const deployer = new CompositeBinaryDeployData({
      instance: this.instance,
      objectName: ATTACHMENT_OBJECT_NAME,
      externalIdField: EXTERNAL_ID_FIELD,
      allOrNone: false,
      api: this.apiVersion,
    });

    return deployer.execute(data);
  }

  private getTimeString(): string {
    const date = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: this.timeZone,
      })
    );
    const dateObject: Record<string, any> = {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };

    for (const [key, value] of Object.entries(dateObject)) {
      dateObject[key] = value < 10 ? `0${value}` : `${value}`;
    }
    const { year, month, day, hours, minutes, seconds } = dateObject;
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  public async update(): Promise<void> {
    if (this.messages.length) {
      const attachmentData = await this.createAttachment();

      const deployResult = await this.deployAttachment(attachmentData);
      const result = deployResult.at(0);
      if (result?.success) {
        this.attachmentId = result.id;
      } else {
        throw new Error(`Update metadata log attachment error \n${result?.error}`);
      }
    }
  }

  public log(message: string): void {
    this.systemLogger.log(message);
    this.messages.push(`${this.getTimeString()} [INFO] ${message} \n`);
  }

  public error(message: string): void {
    this.systemLogger.error(message);
    this.messages.push(`${this.getTimeString()} [ERROR] ${message} \n`);
  }

  public warning(message: string): void {
    this.systemLogger.error(message);
    this.messages.push(`${this.getTimeString()} [WARNING] ${message} \n`);
  }
}
