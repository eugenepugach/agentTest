import { REPOSITORY_NAME_REGEXP, BRANCH_NAME_REGEXP } from '@/constants';
import { Logger } from '@/core';
import { TooManyRequests } from '@/core/errors/too-many-requests.error';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { GitRepoService } from '@/modules/git/providers/repositories/services/git-repo.service';
import { FlosumRepositorySyncDto, SyncDirection } from '@/modules/git/salesforce/dto/flosum-repository-sync.dto';
import { SyncStatus } from '@/modules/git/salesforce/enums/sync-status.enum';
import { SalesforceError } from '@/modules/git/salesforce/errors/salesforce.error';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { SalesforceSyncService } from '@/modules/git/salesforce/services/salesforce-sync.service';
import { SalesforceService } from '@/modules/git/salesforce/services/salesforce.service';
import { sleep } from '@/modules/shared/utils';
import { Container, Service } from 'typedi';
import { HooksUtils } from '@/modules/git/providers/web-hooks/hooks.utils';
import { GitBranchNotFoundError } from '../errors/git-branch-not-found.error';
import { FlosumSyncJob } from '../jobs/flosum-sync.job';
import { GitSyncJob } from '../jobs/git-sync.job';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { BadRequestError } from '@/core/errors/bad-request.error';

@Service({ transient: true })
export class SyncService {
  private logger = new Logger(SyncService.name);
  private sfLogger: SalesforceLogger3;
  private repoService: GitRepoService;
  private repositoriesIntersections: Record<string, string> = {};
  private repoList: Repo[] = [];
  private gitApiService: GitApiService<any>;
  private config: ConnectionDto;
  private prefix: string;

  constructor(private salesforceService: SalesforceService, private salesforceSync: SalesforceSyncService) {}

  private async handleRecordSyncError(record: FlosumRepositorySyncDto, error: Error): Promise<void> {
    if (error instanceof GitBranchNotFoundError) {
      await this.salesforceSync.setStatus(record, SyncStatus.NotSynchronized);
      return;
    }

    if (error instanceof TooManyRequests) {
      await this.salesforceSync.setStatus(record, SyncStatus.Waiting);
      throw error;
    }

    try {
      await this.sfLogger
        .error(
          `${this.prefix} Stop sync job for '${record.repositoryName}' [${record.branchName}] due error - ${error}.`
        )
        .send();
      await this.salesforceSync.updateRemoteState(record, {});
      await this.salesforceSync.setStatus(record, SyncStatus.Error);
    } catch (error) {
      if (error instanceof SalesforceError) {
        throw error;
      }
    }
  }

  private async isIntersects(record: FlosumRepositorySyncDto): Promise<boolean> {
    if (record.repositoryId) {
      const repositoryNameLowerCase = record.repositoryName.toLowerCase();
      const intersection = this.repositoriesIntersections[repositoryNameLowerCase];

      if (!intersection) {
        this.repositoriesIntersections[repositoryNameLowerCase] = record.repositoryName;
      } else if (intersection && intersection !== record.repositoryName) {
        await this.handleRecordSyncError(
          record,
          new Error(
            `Unable to synchronize repository '${record.repositoryName}' due it intersects with another repository by repository key '${repositoryNameLowerCase}' - '${intersection}'`
          )
        );
        return true;
      }
    }

    return false;
  }

  private async checkValidNaming(record: FlosumRepositorySyncDto): Promise<boolean> {
    if (!REPOSITORY_NAME_REGEXP.test(record.repositoryName)) {
      await this.handleRecordSyncError(
        record,
        new Error(
          `Unable to synchronize repository '${record.repositoryName}' due repository name does not meet the naming requirements.`
        )
      );
      return false;
    }

    if (!BRANCH_NAME_REGEXP.test(record.branchName)) {
      await this.handleRecordSyncError(
        record,
        new Error(
          `Unable to synchronize branch '${record.branchName}' in repository '${record.repositoryName}' due branch name does not meet the naming requirements.`
        )
      );
      return false;
    }

    return true;
  }

  private async getOrCreateRepo(record: FlosumRepositorySyncDto, connectionId: string): Promise<Repo> {
    let existedRepo = this.repoList.find((repo) => record.repositoryName === repo.name);

    if (!existedRepo) {
      this.sfLogger.log(
        `${this.prefix} Repository "${record.repositoryName}" does not exists. Creating it on git service.`
      );
      existedRepo = await this.repoService.create({
        name: record.repositoryName,
        autoInit: true,
        defaultBranch: record.branchName,
        private: true,
        createHook: (Container.get(Tokens.config) as ConnectionDto).isBidirectionalSynchronization,
      });
    }

    if (this.config.isBidirectionalSynchronization) {
      const hooks = await existedRepo.hooks.getAll();

      if (
        !hooks.find(
          (hook) =>
            hook.url === HooksUtils.getHookLinkFor(this.config.gitProvider, this.config.applicationUrl, connectionId)
        )
      ) {
        this.sfLogger.log(
          `${this.prefix} Repository "${record.repositoryName}" does't has the agent webhook. Agent will create new repository webhook to enable back sync.`
        );

        await existedRepo.hooks.create(
          HooksUtils.createHookPayload(
            this.config.gitProvider,
            existedRepo.hooks,
            this.config.applicationUrl,
            connectionId
          )
        );
      }
    }

    this.repoList.push(existedRepo);

    return existedRepo;
  }

  async run(): Promise<void> {
    this.gitApiService = Container.get(Tokens.gitApiService) as GitApiService<any>;
    this.repoService = Container.get(Tokens.gitRepoService) as GitRepoService;

    this.config = Container.get(Tokens.config) as ConnectionDto;

    this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
    this.prefix = `[${SyncService.name}] [${this.config.gitProvider.toUpperCase()}]`;

    this.salesforceService.setLoggerId(this.sfLogger.getLoggerId());

    try {
      this.sfLogger.log(`${this.prefix} Start sync job.`);

      await this.sfLogger.log(`${this.prefix} Getting repository records.`).send();
      const repositories = await this.salesforceSync.getRepositoryRecords(Container.get(Tokens.connectionId) as string);

      if (!repositories.length) {
        throw new BadRequestError(`${this.prefix} No repositories to sync.`);
      }

      await this.sfLogger.log(`${this.prefix} Getting branch records.`).send();
      const branches = await this.salesforceSync.getBranchRecords(
        repositories.map((repository) => `'${repository.repositoryId}'`).join(',')
      );

      await this.sfLogger.log(`${this.prefix} Getting repositories from git service.`).send();
      this.repoList = await this.repoService.getAll();

      const recordsToSynchronize = [...repositories, ...branches];
      this.sfLogger.log(`${this.prefix} Have to synchronize ${recordsToSynchronize.length} branches.`);

      for (const record of recordsToSynchronize) {
        this.logger.log(
          `Syncing ${record.repositoryName}[${record.repositoryId}] repository ${record.branchName}[${record.branchId}] branch.`
        );
        this.sfLogger.log(
          `${this.prefix} Syncing repository: "${record.repositoryName}" branch: "${record.branchName}".`
        );

        this.sfLogger.log(`${this.prefix} Checking valid name.`);
        const validName = await this.checkValidNaming(record);

        if (!validName) {
          continue;
        }

        this.sfLogger.log(`${this.prefix} Checking intersects.`);
        const intersects = await this.isIntersects(record);

        if (intersects) {
          continue;
        }

        await this.sfLogger.send();

        let existedRepository: Repo;

        try {
          await this.sfLogger.log(`${this.prefix} Getting Flosum repository`).send();
          existedRepository = await this.getOrCreateRepo(record, Container.get(Tokens.connectionId) as string);
        } catch (error) {
          await this.handleRecordSyncError(
            record,
            error instanceof TooManyRequests
              ? error
              : new Error(
                  `[ERROR] Could not find/create repository.
              Possible error reasons:
              1. Git service is unavailable for the moment.
              2. Repository with this name already created in git, but with another lettercase (repository names are case-sensitive and should be identical).
              3. The agent could not recieve all repositories from git service due permissions that you provided. (See guide how to setup environment variables for this service).
              Original error: ${error}`
                )
          );
          continue;
        }

        await this.sfLogger.log(`${this.prefix} Completed prepare to syncing.`).send();
        if (record.direction === SyncDirection.FlosumToGit) {
          const syncJob = Container.get(FlosumSyncJob);

          await syncJob
            .run({
              repository: existedRepository,
              convertToSFDX: this.config.isConvertToSfdx,
              syncRecord: record,
              provider: this.config.gitProvider,
            })
            .catch((error) => this.handleRecordSyncError(record, error));
        } else {
          const syncJob = Container.get(GitSyncJob);

          await syncJob
            .run({
              repository: existedRepository,
              branch: record.branchName,
              provider: this.config.gitProvider,
              repositoryGit: existedRepository.gitUrl,
              syncRecord: record,
            })
            .catch((error) => this.handleRecordSyncError(record, error));
        }
      }
    } catch (error) {
      this.logger.error(error);

      if (error instanceof TooManyRequests) {
        await this.sfLogger
          .log(
            `${this.prefix} [PAUSE] Pause sync job due error - Rate limit quota for git service exceeded.
          Paused for 1h to refill limit quota continue. 
          This kind of error is not critical just need to wait until we can continue work with git service.`
          )
          .send();

        await sleep(60 * 60 * 1000); // wait for 1h to continue;

        this.run();
      } else {
        await this.sfLogger.error(`${this.prefix} Stop sync job due error - ${error}`).send();
      }

      return;
    }

    await this.sfLogger.log(`${this.prefix} Sync job done.`).send();
    await this.salesforceSync.disableSync(Container.get(Tokens.connectionId) as string).catch(() => null);
  }
}
