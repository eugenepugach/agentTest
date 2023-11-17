import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs';
import * as p from 'path';
import { resolve } from 'path';
import { promisify } from 'util';
import { sleep } from '../../shared/utils';

const rmPromise = promisify(rm);
const readdirPromise = promisify(readdir);

export class FS {
  public static exists(path: string): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      stat(path, (error) => resolve(error ? false : true));
    });
  }

  public static isEmptyDir(path: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!(await this.exists(path))) {
        resolve(true);
        return;
      }

      if (!(await this.isDir(path))) {
        reject(new Error(`${path} is not a folder`));
        return;
      }

      const dirFiles = (await this.readDir(path)).filter((path) => !path.endsWith('.git'));

      resolve(dirFiles.length === 0);
    });
  }

  public static isDir(path: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!(await this.exists(path))) {
        return resolve(false);
      }

      stat(path, (error, stats) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(stats.isDirectory());
      });
    });
  }

  public static makeDir(path: string, recursive = true): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (await this.exists(path)) {
        resolve();
        return;
      }

      mkdir(path, { recursive }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  public static async readDir(path: string, includeSubDirs = false): Promise<string[]> {
    const dirents = await readdirPromise(path, { withFileTypes: true });
    const files = await Promise.all<string[] | string>(
      dirents.map((dirent) => {
        const filepath = resolve(path, dirent.name);

        return dirent.isDirectory() && includeSubDirs ? this.readDir(filepath, true) : filepath;
      })
    );
    return files.flat();
  }

  public static readFile(path: string): Promise<string>;
  public static readFile(path: string, asBuffer: boolean): Promise<Buffer>;
  public static readFile(path: string, asBuffer?: boolean): Promise<Buffer | string> {
    return new Promise((resolve, reject) => {
      readFile(path, asBuffer ? undefined : { encoding: 'utf-8' }, (error, data) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(data);
      });
    });
  }

  public static writeFile(path: string, data: string | Buffer, createDirectories = true): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (createDirectories) {
        await this.makeDir(p.dirname(path));
      }

      writeFile(path, data, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  public static removeDir(path: string, retries = 5, delay = 1000): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let counter = 0;

      // this implementations is nessesary because sometimes git are not done with it internal processes
      // with "path" folder and when we trying to remove it FS throws an error "EBUSY" that mean we need
      // to wait until git is done with that folder and after that we can securely remove it.
      while (counter < retries) {
        try {
          await rmPromise(path, { recursive: true, force: true });
          resolve();
          break;
        } catch (error) {
          counter++;

          if (counter === retries) {
            reject(error);
            break;
          }

          if ('code' in (error as any)) {
            if ((error as any)['code'] === 'EBUSY') {
              counter++;
              await sleep(delay);
              continue;
            }
          }
          reject(error);
          break;
        }
      }
    });
  }

  public static removeFile(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      rm(path, { force: true }, (error) => (error ? reject(error) : resolve()));
    });
  }
}
