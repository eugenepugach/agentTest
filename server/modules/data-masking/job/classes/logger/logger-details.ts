import path from 'path';
import { LogMessage } from '@data-masking-job/interfaces/logger.interfaces';
import { BaseLogger } from '@data-masking-job/classes/logger/base-logger';
import { appendFile, writeFile } from 'fs/promises';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { JOB_LOG_DETAILS_FILENAME } from '@/constants/job';

export class LoggerDetails extends BaseLogger {
  private _messages: LogMessage[] = [];
  private isNeedHeaders = true;

  private _isLoggerInit = false;

  public get isLoggerInit(): boolean {
    return this._isLoggerInit;
  }

  private set isLoggerInit(value) {
    this._isLoggerInit = value;
  }

  private get messages(): LogMessage[] {
    if (!this.isLoggerInit) {
      throw new Error(`Logger Job State wasn't init`);
    }

    return this._messages;
  }

  protected get filePath(): string {
    return path.join(this._jobPath, JOB_LOG_DETAILS_FILENAME);
  }

  public async init(): Promise<LoggerDetails> {
    await writeFile(this.filePath, '');

    await this.start();

    this.isLoggerInit = true;
    return this;
  }

  public log(message: string, objectName?: string): void {
    const logMessage: LogMessage = {
      message,
      date: new Date().getTime(),
      objectName: objectName,
    };

    this.messages.push(logMessage);

    this.updateLoggerState();
  }

  public exception(error: string, objectName?: string): void {
    this.log(`Error: ${error}`, objectName);
  }

  protected async write(): Promise<void> {
    const csvMessages = this.getCsvMessages();
    this._messages = [];

    await appendFile(this.filePath, csvMessages);
  }

  private getCsvMessages(): string {
    const csvMessages = csvStringify(this._messages, {
      header: this.isNeedHeaders,
    });

    this.isNeedHeaders = false;

    return csvMessages;
  }
}
