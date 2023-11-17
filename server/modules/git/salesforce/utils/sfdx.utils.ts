import { readdir } from 'fs';
import { SpawnOptions } from 'child_process';
import path from 'path';
import { Logger } from '@/core';
import { FS } from '@/modules/git/internal/fs.internal';
import spawn from 'cross-spawn';

const logger = new Logger('sfdx');

export class SFDX {
  public static spawnPromise(command: string, args: string, options: SpawnOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      logger.info('spawn %s [%s]', command, args);
      const job = spawn(command, args.split(' '), options);

      job.on('error', (error) => {
        reject(error);
      });

      job.stdout?.on('data', (data) => {
        stdout += data;
      });

      job.stderr?.on('data', (data) => {
        if (data.includes('Warning: ')) return;
        stderr += data;
      });

      job.on('close', (code, signal) => {
        if (code || signal) {
          reject(new Error(stderr || stdout));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   *
   * @param mdapiFolder - folder that contains all mdapi files
   * @param sourceFolder - folder that will be or already contain source files (should be ended with)
   */
  public static async mdapiToSource(mdapiFolder: string, sourceFolder: string): Promise<void> {
    logger.log('goto %s folder and convert mdapi from %s', sourceFolder, mdapiFolder);

    await this.spawnPromise('sfdx', `force:mdapi:convert -r ${mdapiFolder}`, {
      cwd: sourceFolder,
    });
  }

  public static async sourceToMdapi(sourceDir: string, mdapiDir: string): Promise<void> {
    logger.log('goto %s folder and convert source to %s', sourceDir, mdapiDir);

    await this.spawnPromise('sfdx', `force:source:convert -d ${mdapiDir}`, {
      cwd: sourceDir,
    });
  }

  public static async createEmptyProject(sourceDir: string, projectName: string): Promise<void> {
    await this.spawnPromise('sfdx', `force:project:create -t empty -n ${projectName}`, {
      cwd: sourceDir,
    });
  }

  public static async createEmptyPackageXml(mdapiFolder: string): Promise<void> {
    const filePath = path.join(mdapiFolder, 'package.xml');

    logger.log('create empty package.xml at %s', filePath);

    await FS.writeFile(
      filePath,
      `<Package xmlns="http://soap.sforce.com/2006/04/metadata"><version>54.0</version></Package>`
    );
  }

  public static async isSFDXProject(dir: string): Promise<boolean> {
    return new Promise((resolve) => {
      readdir(dir, (error, files) => {
        resolve(
          !error && (files.includes('force-app') || files.includes('config') || files.includes('sfdx-project.json'))
        );
      });
    });
  }
}
