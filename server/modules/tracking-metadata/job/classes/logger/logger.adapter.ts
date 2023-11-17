import { Logger as SFLogger } from '@flosum/salesforce';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';

export class LoggerAdapter extends SFLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    super();

    this.logger = logger;
  }

  public async log(message: string): Promise<void> {
    this.logger.log(message);
  }

  public async error(message: string): Promise<void> {
    this.logger.error(message);
  }

  public async warning(message: string): Promise<void> {
    this.logger.warning(message);
  }
}
