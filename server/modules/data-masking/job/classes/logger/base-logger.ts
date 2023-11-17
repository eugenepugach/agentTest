import * as uuid from 'uuid';
import { Logger } from '@/core';

export abstract class BaseLogger {
  private readonly _systemLogger = new Logger(this._jobId);
  private readonly LOGGER_UPDATE_INTERVAL = 5000;
  private _writeTimeout: NodeJS.Timeout;
  private _loggerState: string;
  private _previousLoggerState: string;

  private get isActualLoggerState(): boolean {
    return this._loggerState === this._previousLoggerState;
  }

  constructor(protected readonly _jobPath: string, protected readonly _jobId: string) {}

  public async kill(): Promise<void> {
    if (this._writeTimeout) {
      clearTimeout(this._writeTimeout);
    }

    await this.writeLog();
  }

  protected updateLoggerState(): void {
    this._loggerState = uuid.v4();
  }

  protected async start(): Promise<void> {
    this._writeTimeout = setInterval(async () => {
      await this.writeLog().catch((error) => this._systemLogger.error(error.message));
    }, this.LOGGER_UPDATE_INTERVAL);
  }

  protected abstract write(): Promise<void>;

  private async writeLog(): Promise<void> {
    if (!this.isActualLoggerState) {
      this._previousLoggerState = this._loggerState;
      await this.write();
    }
  }
}
