import { Request, Response } from 'express';
import { v4 } from 'uuid';
import { Logger } from './logger.class';
import { ContainerInstance } from 'typedi';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';

export class Context {
  public readonly requestId = v4();
  public container: ContainerInstance;
  public provider: GitApiService<any>;
  // Response body
  public data: any;
  public statusCode: number;
  public requestEnded = false;
  public logger = new Logger(`request-${this.requestId}`);

  private _handled = false;

  public get handled(): boolean {
    return this._handled;
  }

  constructor(public req: Request, public res: Response) {
    this.logger.info(`Instantiated new context at ${req.path}`);
  }

  handle(): void {
    this._handled = true;
  }
}
