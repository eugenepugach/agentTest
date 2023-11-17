import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';

export interface BaseLogger {
  log(line: string): void;
  logError(error: Error | BaseVeevaError<any>): void;
  updateLog(): Promise<string>;
}
