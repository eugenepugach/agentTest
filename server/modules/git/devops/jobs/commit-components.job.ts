import { CommitComponentsDto } from '../dto/commit-components.dto';
import { DeletedComponent } from '../../salesforce/types/deleted-component.type';
import EventEmitter from 'events';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { GitUtils } from '../utils/git.utils';
import { MDApiUtils } from '../utils/mdapi.utils';
import { SFDXUtils } from '../utils/sfdx.utils';
import Container, { Service } from 'typedi';
import childTypes from '../../parsers/data/child-types';
import { getProtocol } from '../../../shared/utils';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { DEFAULT_GIT_USER_EMAIL } from '@/constants';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { SFDX } from '../../salesforce/utils/sfdx.utils';
import { FS } from '../../internal/fs.internal';
import { join } from 'path';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { FORCE_APP_DEFAULT_DIR } from '@/constants';

@Service({ transient: true })
export class CommitComponentsJob extends EventEmitter {
  private readonly COMPONENTS_PER_TICK = 1000;

  private commitData: CommitComponentsDto;
  private componentsToWrite = 0;
  private componentsToDelete = 0;

  private mdapiUtils: MDApiUtils;
  private sfdxUtils: SFDXUtils;
  private gitUtils: GitUtils;

  private startTime = Date.now();
  private prefix: string;

  public sfLogger: SalesforceLogger3;

  private async getRemote() {
    const { repo } = this.commitData;

    const gitCredentials = Container.get(Tokens.credentials) as BaseCredentialsDto;

    if (this.commitData.provider === GitProvider.Bitbucket) {
      const bitbucketApi = Container.get(BitbucketApiService);

      await bitbucketApi.isLoggedIn();
    }

    return repo.gitUrl.replace(
      /http(s)?:\/\/(.+@)?/,
      `${getProtocol(repo.gitUrl)}://${gitCredentials.getGitShellAuthorizationString()}@`
    );
  }

  private groupComponentsByFileName(components: FlosumComponent[]): FlosumComponent[] {
    components.sort((a) => (childTypes.includes(a.fileType) ? 1 : -1));

    const componentsByFilename: Record<string, FlosumComponent[]> = {};

    for (const component of components) {
      componentsByFilename[component.fileName] ||= [];
      componentsByFilename[component.fileName].push(component);
    }

    return Object.values(componentsByFilename).reduce((acc, next) => [...acc, ...next], []);
  }

  private async writeComponents(components: FlosumComponent[]): Promise<void> {
    components = this.groupComponentsByFileName(components);

    let counter = 0;

    while (components.length) {
      const componentsToWrite = components.splice(0, this.COMPONENTS_PER_TICK);

      await this.mdapiUtils.writeFlosumComponents(componentsToWrite, {
        skipChildErrors: this.commitData.branch.name === 'master',
      });

      counter += componentsToWrite.length;

      this.sfLogger.log(`${this.prefix} Wrote ${counter}/${this.componentsToWrite} components`);
      await this.sfLogger.send();
    }
  }

  private async removeComponents(components: DeletedComponent[]): Promise<void> {
    components.sort((component) => (childTypes.includes(component.type) ? -1 : 1));

    let counter = 0;

    while (components.length) {
      const componentsToDelete = components.splice(0, this.COMPONENTS_PER_TICK);

      await this.mdapiUtils.removeComponents(componentsToDelete);

      counter += componentsToDelete.length;

      this.sfLogger.log(`${this.prefix} Deleted ${counter}/${this.componentsToDelete} components`);
      await this.sfLogger.send();
    }
  }

  private async cleanUp(): Promise<void> {
    this.gitUtils && (await this.gitUtils.removeDir().catch(() => void 0));
    this.mdapiUtils && (await this.mdapiUtils.removeDir().catch(() => void 0));
    this.sfdxUtils && (await this.sfdxUtils.removeDir().catch(() => void 0));
  }

  private async exec(): Promise<void> {
    const { repo, branch, components, convertToSFDX, message, user } = this.commitData;

    this.mdapiUtils = new MDApiUtils();
    this.gitUtils = new GitUtils(await this.getRemote());
    this.sfdxUtils = new SFDXUtils();

    let isConvertToSFDX = convertToSFDX;

    try {
      await this.sfLogger.log(`${this.prefix} Start cloning repository.`).send();
      await this.gitUtils.clone(branch.name, repo.name);

      if (!this.commitData.force) {
        this.sfLogger.log(`${this.prefix} Prepare mdapi files.`);
        await this.mdapiUtils.prepareMdapi(this.gitUtils.dir);
      } else {
        this.sfLogger.log(`${this.prefix} Force sync. Skip preparing mdapi from repository.`);
      }

      await this.sfLogger.log(`${this.prefix} Checking written components.`).send();
      if (components.writed) {
        this.sfLogger.log(`${this.prefix} Preparing to write components`);
        this.componentsToWrite = components.writed.length;
        await this.writeComponents(components.writed);

        await this.sfLogger.send();
      }

      await this.sfLogger.log(`${this.prefix} Checking deleted components.`).send();
      if (components.deleted) {
        this.sfLogger.log(`${this.prefix} Preparing to delete components`);
        this.componentsToDelete = components.deleted.length;
        await this.removeComponents(components.deleted);

        await this.sfLogger.send();
      }

      await this.sfLogger.send();

      const isEmptyGitFolder = await FS.isEmptyDir(this.gitUtils.dir);

      if (await SFDX.isSFDXProject(this.gitUtils.dir)) {
        isConvertToSFDX = true;
        await FS.removeDir(join(this.gitUtils.dir, 'force-app'));
      } else {
        if (isConvertToSFDX) {
          if (!isEmptyGitFolder) {
            isConvertToSFDX = false;
          }
        }
        await this.gitUtils.clearDir();
      }

      if (isConvertToSFDX) {
        await this.sfLogger.log(`${this.prefix} Start converting to SFDX.`).send();

        await this.sfdxUtils.createProjectFrom(this.mdapiUtils.dir);
        await this.sfdxUtils.copyProjectTo(this.gitUtils.dir, !isEmptyGitFolder);
        await this.sfdxUtils.copyVlocityComponents(this.mdapiUtils.dir, join(this.gitUtils.dir, FORCE_APP_DEFAULT_DIR));
        await this.sfdxUtils.removeDir();
      } else {
        await this.sfLogger.log(`${this.prefix} Copying mdapi to git folder.`).send();

        await this.mdapiUtils.copyMdapiTo(this.gitUtils.dir);
      }

      await this.sfLogger.log(`${this.prefix} Committing and pushing source to git.`).send();

      await this.gitUtils.commitAndPush(message, { email: DEFAULT_GIT_USER_EMAIL, name: user.name }, branch.name);

      await this.gitUtils.removeDir();
      await this.mdapiUtils.removeDir();

      const commitedComponents = this.componentsToWrite + this.componentsToDelete;

      await this.sfLogger
        .log(
          `${this.prefix} Commit job done. Time spent - ${
            Date.now() - this.startTime
          }ms. Committed components - ${commitedComponents}.`
        )
        .send();
    } catch (error) {
      await this.cleanUp();

      await this.sfLogger.error(`${this.prefix} ${error}`).send();
      throw error;
    }
  }

  public async run(commitData: CommitComponentsDto, prefix?: string): Promise<void> {
    this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
    this.prefix = `${prefix ? `${prefix} ` : ''}[${CommitComponentsDto.name}]`;

    await this.sfLogger.log(`${this.prefix} Checking commit components.`);
    const hasComponents = !!commitData.components?.writed || !!commitData.components?.deleted;

    if (!hasComponents) {
      await this.sfLogger.log(`${this.prefix} Nothing to commit. Skip.`).send();
      return;
    }

    this.commitData = commitData;

    await this.exec();
  }
}
