import { ChildProcessByStdio, spawn } from 'child_process';
import { join } from 'path';
import shortid from 'shortid';
import { Logger } from '@/core';
import { FS } from '../internal/fs.internal';

type ChildPaths = 'sync.child' | 'disable.sync' | 'flosum.commit' | 'git.commit';

export class Child {
  private readonly logger = new Logger(Child.name);
  private readonly INTERPRETER = 'node';
  private process: ChildProcessByStdio<any, any, any>;

  constructor(private path: ChildPaths) {}

  public execute(message: { data: any }, resolveOnExit = false): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const fileId = shortid();
      const socketPath = join(process.cwd(), '.sockets', fileId);

      await FS.writeFile(socketPath, JSON.stringify(message));

      this.process = spawn(
        `${this.INTERPRETER}`,
        `${process.env.NODE_ENV === 'development' ? '-r ts-node/register -r tsconfig-paths/register ' : ''}${join(
          __dirname,
          this.path
        )} --socketPath=${socketPath}`.split(' '),
        {
          env: process.env,
          detached: false,
          stdio: ['inherit', 'inherit', 'inherit'],
        }
      );

      this.process.once('error', async (error) => {
        this.logger.error('[%s]: %s', this.path, error.message);
        await FS.removeFile(socketPath);
        this.process.kill();
        reject(error);
      });

      this.process.once('close', async () => {
        this.logger.error('[%s]: closed', this.path);
        await FS.removeFile(socketPath);
        if (resolveOnExit) {
          resolve();
        }
      });
      if (!resolveOnExit) {
        resolve();
      }
    });
  }

  public kill(): void {
    this.process.kill();
  }
}
