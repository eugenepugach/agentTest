import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';
import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';

export class EmptyLogger implements BaseLogger {
  log(_line: string): void {
    return;
  }

  logError(_error: Error | BaseVeevaError<any>): void {
    return;
  }

  updateLog(): Promise<string> {
    return Promise.resolve('');
  }
}
