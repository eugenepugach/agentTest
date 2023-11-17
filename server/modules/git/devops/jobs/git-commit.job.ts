import { Logger } from '@/core';
import { FS } from '@/modules/git/internal/fs.internal';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { getProtocol } from '@/modules/shared/utils';
import { relative } from 'path';
import Container, { Service } from 'typedi';
import { DEFAULT_GIT_USER_EMAIL, DEFAULT_GIT_USER_NAME } from '@/constants';
import { SalesforceCommitsManager } from '../../salesforce/services/salesforce-commits-manager.service';
import { GitCommit, GitCommitDto } from '../dto/git-commit.dto';
import { prepareGitChangedPaths } from '../utils/git-commit.utils';
import { GitUtils } from '../utils/git.utils';
import { MDApiUtils } from '../utils/mdapi.utils';
import { ApiError } from '@/core/errors/api.error';
import { SalesforceError } from '@/modules/git/salesforce/errors/salesforce.error';
import { GitCommitService } from '../services/git-commit.service';
import { SyncStatus } from '@/modules/git/salesforce/enums/sync-status.enum';
import { FlosumCommitError } from '../errors/flosum-commit.error';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { SFDX } from '../../salesforce/utils/sfdx.utils';
import { GitChanges } from '../../internal/types/git-changes.type';
import { ListOfParsedComponents } from '../types/list-of-parsed-components.type';
import { convertToCleanPaths, readFilesByFilename } from '@/modules/git/parsers/utils';
import { Git } from '@/modules/git/internal/git.internal';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { ProvidersFactory } from '../utils/connection';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { LoggerTypes } from '@/modules/git/salesforce/types/sf-logger-v3-types';

@Service({ transient: true })
export class GitCommitJob {
  private readonly MAX_COMPONENTS_PER_TICK = +(process.env.MAX_COMPONENTS_PER_TICK || 3000);
  private gitCommitData: GitCommitDto;
  private gitUtils: GitUtils;
  private mdapiUtils: MDApiUtils;
  private sfLogger: SalesforceLogger3;
  private logger = new Logger(GitCommitJob.name);
  private lastCommitHash: string;
  private commitId = '';
  private gitApiService: GitApiService<any>;
  private config: ConnectionDto;
  private prefix: string;

  private stats = {
    removed: 0,
    modified: 0,
    added: 0,
  };

  private async getRemote() {
    const { repositoryGit } = this.gitCommitData;

    const gitCredentials = Container.get(Tokens.credentials) as BaseCredentialsDto;

    if (this.gitCommitData.provider === GitProvider.Bitbucket) {
      const bitbucketApi = Container.get(BitbucketApiService);

      await bitbucketApi.isLoggedIn();
    }

    return repositoryGit.replace(
      /http(s)?:\/\/(.+@)?/,
      `${getProtocol(repositoryGit)}://${gitCredentials.getGitShellAuthorizationString()}@`
    );
  }

  constructor(private gitCommit: GitCommitService, private providersFactory: ProvidersFactory) {}

  private resetStats(): void {
    this.stats = {
      removed: 0,
      modified: 0,
      added: 0,
    };
  }

  private async updateFileNamesForSFDXProject(): Promise<void> {
    const fileNames = [...this.gitCommitData.fileNames];
    this.gitCommitData.fileNames = [];

    for (const fileName of fileNames) {
      this.gitCommitData.fileNames.push(...(await readFilesByFilename(fileName, this.mdapiUtils.dir)));
    }
  }

  private async fetchCommits() {
    if (this.gitCommitData.force) {
      return;
    }

    const fileNames: string[] = [];

    for (const commit of this.gitCommitData.commits) {
      const commitDescribe = await this.gitUtils.describeCommit(commit.id);
      commit.username = commitDescribe.author;
      commit.message = commitDescribe.message;
      commit.files = commitDescribe.changes;
      commit.email = commitDescribe.email;

      if (commit.email === DEFAULT_GIT_USER_EMAIL) {
        throw new FlosumCommitError();
      }

      fileNames.push(...Object.values(commit.files).flat());
    }

    this.gitCommitData.fileNames = [...new Set(prepareGitChangedPaths(fileNames))];
  }

  private async sendComponents(
    author: string,
    message: string,
    parsedComponents: ListOfParsedComponents[]
  ): Promise<void> {
    const list = parsedComponents.reduce(
      (acc, next) => {
        acc.inserted.push(...next.inserted);
        acc.modified.push(...next.modified);
        acc.removed.push(...next.removed);

        return acc;
      },
      {
        inserted: [],
        modified: [],
        removed: [],
      } as ListOfParsedComponents
    );

    const commitsManager = new SalesforceCommitsManager({
      recordTypes: this.gitCommit.getRecordTypes(),
      branchId: this.gitCommit.getBranchId(),
      repositoryId: this.gitCommit.getRepositoryId(),
      logger: this.sfLogger,
      commitId: this.commitId,
    });

    await commitsManager.proceedCommits([
      {
        author,
        message,
        inserted: list.inserted,
        modified: list.modified,
        removed: list.removed,
      },
    ]);
  }

  private async handleCommit(commit: GitCommit, isSFDXProject: boolean): Promise<void> {
    await this.sfLogger.log(`${this.prefix} Download components metadata from Flosum.`).send();
    await this.gitCommit.fetchComponentsMetadata(isSFDXProject);

    const { added, modified, removed } = commit.files as GitChanges;

    if (isSFDXProject) {
      modified.push(...removed.splice(0));
    }

    const files = convertToCleanPaths(
      prepareGitChangedPaths([...added, ...modified, ...removed], isSFDXProject && !this.gitCommitData.force)
    );

    let parsedComponentsCount = 0;
    const parsedComponents: ListOfParsedComponents[] = [];

    if ((added.length || modified.length) && this.gitCommit.getRepositoryId()) {
      this.commitId = await this.gitCommit.createCommit(commit.message as string);
    }

    const totalFilesCount = files.length;
    let filesProceeded = 0;
    while (files.length) {
      const filePath = files.shift() as string;
      const fileComponents = await this.gitCommit.proceedFile(
        filePath,
        this.mdapiUtils.dir,
        isSFDXProject && !this.gitCommitData.force
      );

      parsedComponentsCount +=
        fileComponents.inserted.length + fileComponents.removed.length + fileComponents.modified.length;

      this.stats.added += fileComponents.inserted.length;
      this.stats.modified += fileComponents.modified.length;
      this.stats.removed += fileComponents.removed.length;

      filesProceeded++;

      if (filesProceeded % 100 === 0) {
        this.logger.log(
          'proceeded files %d/%d (components - %d)',
          filesProceeded,
          totalFilesCount,
          parsedComponentsCount
        );
      }

      parsedComponents.push(fileComponents);

      if (parsedComponentsCount > this.MAX_COMPONENTS_PER_TICK) {
        await this.sendComponents(commit.username as string, commit.message as string, parsedComponents);
        await this.sfLogger.log(`${this.prefix} Processed ${parsedComponentsCount} components.`).send();
        parsedComponentsCount = 0;
        parsedComponents.splice(0);
      }
    }

    if (parsedComponents.length) {
      await this.sendComponents(commit.username as string, commit.message as string, parsedComponents);
      await this.sfLogger.log(`${this.prefix} Processed ${parsedComponentsCount} components.`).send();
    }
  }

  private async proceedCommits(isSFDXProject: boolean): Promise<void> {
    const commits = [...this.gitCommitData.commits];
    const commitsCount = commits.length;

    let parsedCommits = 0;
    while (commits.length) {
      const commit = commits.shift() as GitCommit;

      if (!this.gitCommitData.force) {
        if (this.gitCommit.getRepositoryId()) {
          await this.gitUtils.checkoutTo(commit.id);
          await this.mdapiUtils.prepareMdapi(this.gitUtils.dir);
        } else {
          await this.gitUtils.checkoutTo(this.lastCommitHash);
          await this.mdapiUtils.prepareMdapi(this.gitUtils.dir);
        }
      }

      await this.handleCommit(commit, isSFDXProject);
      await this.mdapiUtils.removeDir();
      parsedCommits += 1;

      await this.sfLogger.log(`${this.prefix} Commit Summary`);
      await this.sfLogger.log(`${this.prefix} Added ${this.stats.added} components`);
      await this.sfLogger.log(`${this.prefix} Modified ${this.stats.modified} components`);
      await this.sfLogger.log(`${this.prefix} Removed ${this.stats.removed} components`);
      await this.sfLogger.log(`${this.prefix} Proceeded ${parsedCommits}/${commitsCount} commits.`).send();
      this.resetStats();
    }
  }

  private async cleanUp(): Promise<void> {
    this.gitUtils && (await this.gitUtils.removeDir().catch(() => void 0));
    this.mdapiUtils && (await this.mdapiUtils.removeDir().catch(() => void 0));
  }

  async run(gitCommitDto: GitCommitDto): Promise<void> {
    this.gitCommitData = gitCommitDto;
    this.gitCommit.setCommitDto(this.gitCommitData);

    this.gitApiService = Container.get(Tokens.gitApiService) as GitApiService<any>;
    this.config = Container.get(Tokens.config) as ConnectionDto;

    this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
    this.prefix = `[GIT -> FLOSUM] [Repository: ${gitCommitDto.repository}] [Branch: ${gitCommitDto.branch}] [${GitCommitJob.name}]`;

    this.gitUtils = new GitUtils(await this.getRemote());
    this.mdapiUtils = new MDApiUtils();

    this.sfLogger.log(`${this.prefix} Start Git-commit job.`);

    try {
      this.sfLogger.log(`${this.prefix} Fetch salesforce data.`);
      await this.gitCommit.fetchRepositoryOrBranchData();

      await this.gitCommit.updateStatus(SyncStatus.InProgress);

      this.sfLogger.log(`${this.prefix} Fetch remote branch hash.`);
      this.lastCommitHash = await Git.getRemoteHash(await this.getRemote(), this.gitCommitData.branch);

      this.logger.log('Last git repository hash is %s.', this.lastCommitHash);

      const syncStatus = await this.gitCommit.checkSyncStatus(this.lastCommitHash);

      if (syncStatus) {
        this.sfLogger.log('Branch synchronized. Skip.');
        await this.gitCommit.updateStatus(SyncStatus.Completed);
        return;
      }

      this.sfLogger.log(`${this.prefix} Cloning git repository from ${this.gitCommitData.repositoryGit}.`);
      await this.gitUtils.clone(this.gitCommitData.branch, this.gitCommitData.repository);

      this.sfLogger.log(`${this.prefix} Fetch changes files from git commits.`);

      const isSFDXProject = await SFDX.isSFDXProject(this.gitUtils.dir);

      await this.fetchCommits();

      if (!this.sfLogger.getLoggerId()) {
        this.sfLogger.setLoggerId(await SalesforceLogger3.createLoggerId(LoggerTypes.commit));
      }

      await this.sfLogger.send();

      if (gitCommitDto.force) {
        await this.mdapiUtils.prepareMdapi(this.gitUtils.dir);
        await this.sfLogger.log(`${this.prefix} Start force commit job to sync repository`).send();

        const allFiles = (await FS.readDir(this.mdapiUtils.dir, true)).map((filePath) =>
          relative(this.mdapiUtils.dir, filePath)
        );

        this.sfLogger.log(`${this.prefix} Force commit. Have to parse ${allFiles.length} files before sync.`);

        this.gitCommitData.fileNames = [];
        this.gitCommitData.commits = [
          {
            files: {
              modified: allFiles,
              added: [],
              removed: [],
            },
            id: await this.gitUtils.getCurrentHash(),
            message: 'sync components',
            username: DEFAULT_GIT_USER_NAME,
          },
        ];
      }

      await this.gitCommit.updateRemoteState({
        [this.gitCommitData.repositoryGit]: { lastCommit: this.lastCommitHash },
      });

      await this.sfLogger
        .log(`${this.prefix} [SFDX: ${isSFDXProject ? 'YES' : 'NO'}] Start proceeding git commits. `)
        .send();
      await this.proceedCommits(isSFDXProject);

      await this.sfLogger.log(`${this.prefix} Job done.`).send();

      await this.gitCommit.updateStatus(SyncStatus.Completed);
    } catch (error) {
      await this.cleanUp();

      if (error instanceof FlosumCommitError) {
        await this.gitCommit.updateStatus(SyncStatus.Completed).catch(() => void 0);
        this.logger.log(`${this.prefix} Git commits not have a changes.`);
      } else {
        await this.logger.error(
          `${this.prefix} Error has occurred when commit from git to Flosum - ${
            error instanceof ApiError || error instanceof SalesforceError ? error.toString() : error
          }`
        );
        await this.gitCommit.updateRemoteState({});
        await this.gitCommit.updateStatus(SyncStatus.Error).catch(() => void 0);
        throw error;
      }
    } finally {
      await this.cleanUp();
      await this.sfLogger.send().catch(() => void 0);
    }
  }
}
