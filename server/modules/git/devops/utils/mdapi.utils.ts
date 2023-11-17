import path, { join } from 'path';
import { Logger } from '@/core';
import { FS } from '../../internal/fs.internal';
import { Shell } from '../../internal/shell.internal';
import { MDApiWriter } from '../../parsers/mdapi';
import { MDApiRemover } from '@/modules/git/parsers/mdapi';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { DeletedComponent } from '../../salesforce/types/deleted-component.type';
import { SFDX } from '../../salesforce/utils/sfdx.utils';
import shortid from 'shortid';
import { SFDXUtils } from '@/modules/git/devops/utils/sfdx.utils';
import { FORCE_APP_DEFAULT_DIR } from '@/constants';

const logger = new Logger('mdapi-utils');

export class MDApiUtils {
  private uniqueId = shortid();

  private get fullDirName(): string {
    return `${this.uniqueId}`;
  }

  public get dir(): string {
    return path.join(process.cwd(), '.temp', 'mdapi', this.fullDirName);
  }

  public async prepareMdapi(sourceDir: string): Promise<void> {
    if (await SFDX.isSFDXProject(sourceDir)) {
      const projectDir = join(sourceDir, '..', '..', 'sfdx');
      try {
        logger.log('detected sfdx project convert to mdapi');
        await FS.makeDir(join(projectDir, this.fullDirName));
        await SFDX.createEmptyProject(projectDir, this.fullDirName);

        if (await FS.exists(`${sourceDir}/force-app`)) {
          await Shell.exec(`cp -r ${sourceDir}/force-app ${join(projectDir, this.fullDirName)}`);
        }

        await SFDX.sourceToMdapi(join(projectDir, this.fullDirName), this.dir);

        const sfdxUtils = new SFDXUtils();
        await sfdxUtils.copyVlocityComponents(join(projectDir, this.fullDirName, FORCE_APP_DEFAULT_DIR), this.dir);

        await FS.removeDir(join(projectDir, this.fullDirName));
      } catch (error) {
        await FS.removeDir(join(projectDir, this.fullDirName));
        throw error;
      }
    } else {
      logger.log('copy mdapi to temp dir');

      await FS.makeDir(this.dir);

      try {
        await Shell.exec(`cp -r ${sourceDir}/* ${this.dir}`);
        await FS.removeDir(`${this.dir}/.git`);
      } catch {}
    }
  }

  public async copyMdapiTo(sourceDir: string): Promise<void> {
    if (!(await FS.exists(sourceDir))) {
      throw new Error(`[copyMdapiTo] Source forlder not found - ${sourceDir}`);
    }

    if (!(await FS.isEmptyDir(`${this.dir}`))) {
      await FS.removeFile(`${this.dir}/package.xml`);
      await Shell.exec(`cp -r ${this.dir}/* ${sourceDir}`);
    }
  }

  public async removeDir(): Promise<void> {
    await FS.removeDir(this.dir);
  }

  public async writeFlosumComponents(
    components: FlosumComponent[],
    options: { skipChildErrors: boolean }
  ): Promise<void> {
    const writer = new MDApiWriter({
      components,
      sourceDir: this.dir,
      skipChildErrors: options?.skipChildErrors,
    });

    await writer.start();
  }

  public async removeComponents(components: DeletedComponent[]): Promise<void> {
    const remover = new MDApiRemover(components, this.dir);

    await remover.start();
  }
}
