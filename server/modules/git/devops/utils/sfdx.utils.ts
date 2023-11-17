import path from 'path';
import { FS } from '../../internal/fs.internal';
import { Shell } from '../../internal/shell.internal';
import { SFDX } from '../../salesforce/utils/sfdx.utils';
import shortid from 'shortid';
import { NO_RESULTS_TO_FORMAT } from '@/constants/sfdx';
import { readdir, cp } from 'fs/promises';
import { isVlocityComponent } from '@/modules/git/parsers/utils/vlocity';

export class SFDXUtils {
  private readonly PROJECTS_PATH = path.join(process.cwd(), '.temp', 'sfdx');
  private uniqueId = shortid();

  private get fullProjectName(): string {
    return `${this.uniqueId}`;
  }

  public get dir(): string {
    return path.join(this.PROJECTS_PATH, this.fullProjectName);
  }

  public async createProjectFrom(mdapiDir: string): Promise<void> {
    if (!(await FS.exists(this.PROJECTS_PATH))) {
      await FS.makeDir(this.PROJECTS_PATH);
    }

    await SFDX.createEmptyProject(this.PROJECTS_PATH, this.fullProjectName);
    await SFDX.createEmptyPackageXml(mdapiDir);

    try {
      await SFDX.mdapiToSource(mdapiDir, this.dir);
    } catch (error) {
      if (!error.message.match(NO_RESULTS_TO_FORMAT)) {
        throw error;
      }
    }
  }

  public async copyProjectTo(sourceDir: string, copyOnlyForceAppFolder = true): Promise<void> {
    if (copyOnlyForceAppFolder) {
      if (!(await FS.exists(`${sourceDir}/sfdx-project.json`))) {
        copyOnlyForceAppFolder = false;
      }
    }

    if (copyOnlyForceAppFolder) {
      await Shell.exec(`cp -r ${this.dir}/force-app ${sourceDir}`);
    } else {
      await Shell.exec(`cp -r ${this.dir}/* ${sourceDir}`);
    }
  }

  public async removeDir(): Promise<void> {
    await FS.removeDir(this.dir);
  }

  public async copyVlocityComponents(sourceDir: string, targetDir: string): Promise<void> {
    const files = await readdir(sourceDir);

    const vlocityComponents = files.filter((file) => isVlocityComponent(file));

    for (const component of vlocityComponents) {
      const source = path.join(sourceDir, component);
      const target = path.join(targetDir, component);

      await cp(source, target, { recursive: true });
    }
  }
}
