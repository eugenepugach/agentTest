import { debug, Debugger } from 'debug';
import { LOGGER_DEFAULT_NAMESPACE } from '../constants';

export class Logger {
  private _log: Debugger;
  private _error: Debugger;
  private _info: Debugger;

  public get log(): Debugger {
    return this._log;
  }

  public get error(): Debugger {
    return this._error;
  }

  public get info(): Debugger {
    return this._info;
  }

  constructor(private namespace: string) {
    this._log = this.createDebugger('LOG');
    this._error = this.createDebugger('ERROR');
    this._info = this.createDebugger('INFO');
  }

  private createDebugger(type: string): Debugger {
    const debugInstance = debug(`${LOGGER_DEFAULT_NAMESPACE} [${type}] [${this.namespace}] ->`);
    return ((formatter: any, ...args: any[]) => {
      if (type === 'ERROR') {
        console.error(formatter, ...args);
      }

      return debugInstance(formatter, ...args);
    }) as Debugger;
  }
}
