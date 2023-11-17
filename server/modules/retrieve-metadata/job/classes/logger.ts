import { Logger as SystemLogger } from '@/core';
import { appendFile } from 'fs/promises';
import path from 'path';
import CsvUtils from '@/modules/shared/utils/csv.utils';
import { Logger as SFLogger } from '@flosum/salesforce';
import { JOB_LOG_DETAILS_FILENAME } from '@/constants/job';
import { RETRIEVE_METADATA_FOLDER_NAME } from '@/modules/retrieve-metadata/constants';
import { dataPath } from '@/configs/path';

export default class Logger extends SFLogger {
  private readonly logPath: string;
  private initMessage = true;

  constructor(jobId: string, private systemLogger: SystemLogger) {
    super();
    this.logPath = path.join(dataPath, RETRIEVE_METADATA_FOLDER_NAME, jobId, JOB_LOG_DETAILS_FILENAME);
  }

  private async appendToLog(log: { date: number; type: string; message: string }): Promise<void> {
    const options = { header: false };

    if (this.initMessage) {
      options.header = true;
      this.initMessage = false;
    }

    const payload: string = await CsvUtils.stringify([log], options);

    await appendFile(this.logPath, payload).catch((error) => this.systemLogger.error(error.message));
  }

  public async log(message: string): Promise<void> {
    this.systemLogger.log(message);
    await this.appendToLog({ date: new Date().getTime(), type: 'INFO', message });
  }

  public async error(message: string): Promise<void> {
    this.systemLogger.error(message);
    await this.appendToLog({ date: new Date().getTime(), type: 'ERROR', message });
  }

  public async warning(message: string): Promise<void> {
    this.systemLogger.log(message);
    await this.appendToLog({ date: new Date().getTime(), type: 'WARNING', message });
  }
}
