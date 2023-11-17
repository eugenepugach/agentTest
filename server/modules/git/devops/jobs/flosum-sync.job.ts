import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { Container, Service } from 'typedi';
import { DEFAULT_GIT_USER_EMAIL, DEFAULT_GIT_USER_NAME } from '@/constants';
import { BranchDto } from '../../providers/branches/dto/branch.dto';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { FlosumRepositorySyncDto } from '../../salesforce/dto/flosum-repository-sync.dto';
import { SyncStatus } from '../../salesforce/enums/sync-status.enum';
import { SalesforceRetrieverService } from '../../salesforce/services/salesforce-retriever.service';
import { SalesforceSyncService } from '../../salesforce/services/salesforce-sync.service';
import { SalesforceService } from '../../salesforce/services/salesforce.service';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { CommitComponentsDto } from '../dto/commit-components.dto';
import { RemoteState } from '../types/remote-state.type';
import { SyncJobRunOptions } from '../types/sync-job-run-options.type';
import { CommitComponentsJob } from './commit-components.job';

@Service({ transient: true })
export class FlosumSyncJob {
  private syncData: FlosumRepositorySyncDto;
  private repository: Repo;
  private branch: BranchDto;
  private sfLogger: SalesforceLogger3;
  private provider: GitProvider;
  private prefix: string;

  constructor(
    private salesforceSync: SalesforceSyncService,
    private salesforceService: SalesforceService,
    private commitJob: CommitComponentsJob
  ) {}

  private async createBranchIfNotExists(): Promise<void> {
    let branch = await this.repository.branches.getOne(this.syncData.branchName).catch(() => null);

    if (!branch) {
      branch = await this.repository.branches.create({
        name: this.syncData.branchName,
      });
    }

    this.branch = branch;
  }

  private async getComponentIds(): Promise<string[]> {
    if (this.syncData.repositoryId) {
      return this.salesforceSync.getComponentsFromRepository(this.syncData.repositoryId);
    } else {
      return this.salesforceSync.getBranchComponents(this.syncData.branchId);
    }
  }

  private async getComponents(): Promise<FlosumComponent[]> {
    const componentIds = await this.getComponentIds();

    const retriever = new SalesforceRetrieverService(this.salesforceService);

    const components = await retriever.run(componentIds);

    return components;
  }

  private async getCommitDto(convertToSFDX: boolean): Promise<CommitComponentsDto> {
    const commitDto = new CommitComponentsDto();

    commitDto.message = 'Sync repository';
    commitDto.user = {
      name: DEFAULT_GIT_USER_NAME,
      email: DEFAULT_GIT_USER_EMAIL,
    };
    commitDto.components = {
      writed: await this.getComponents(),
    };
    commitDto.convertToSFDX = convertToSFDX;
    commitDto.repo = this.repository;
    commitDto.branch = this.branch;
    commitDto.force = true;
    commitDto.provider = this.provider;

    return commitDto;
  }

  private async checkSyncStatus(): Promise<boolean> {
    const remoteStateId = await this.salesforceSync.getRemoteStateAttachmentId(this.syncData);
    const remoteState = await this.salesforceService
      .retrieveAttachment<RemoteState>(remoteStateId)
      .then((value) => (typeof value === 'string' ? JSON.parse(value) : value))
      .catch(() => ({} as RemoteState));

    if (remoteState[this.repository.gitUrl]) {
      if (remoteState[this.repository.gitUrl].lastCommit === this.branch.sha) {
        return true;
      }
    }

    return false;
  }

  private async updateLastCommit(): Promise<void> {
    const branch = await this.repository.branches.getOne(this.branch.name);

    await this.sfLogger.log(`${this.prefix} Update remote state.`);

    const remoteState = {
      [this.repository.gitUrl]: { lastCommit: branch.sha },
    };

    await this.salesforceSync.updateRemoteState(this.syncData, remoteState);
  }

  async run({ syncRecord, repository, convertToSFDX, provider }: SyncJobRunOptions): Promise<void> {
    this.syncData = syncRecord;
    this.provider = provider;
    this.repository = repository;
    this.sfLogger = Container.get(SalesforceLogger3);
    this.prefix = `[FLOSUM -> GIT] [Repository: ${this.syncData.repositoryName}] [Branch: ${this.syncData.branchName}]`;

    try {
      await this.sfLogger.log(`${this.prefix} Start Flosum sync job`).send();
      await this.salesforceSync.setStatus(this.syncData, SyncStatus.InProgress);

      this.sfLogger.log(`${this.prefix} Checking repository on Flosum side.`);
      await this.createBranchIfNotExists();

      await this.sfLogger.log(`${this.prefix} Checking sync status.`).send();
      const syncStatus = await this.checkSyncStatus();

      this.sfLogger.log(`${this.prefix} Sync status ${syncStatus}.`);
      if (syncStatus) {
        await this.salesforceSync.setStatus(this.syncData, SyncStatus.Completed);
        await this.sfLogger.log(`${this.prefix} Branch synchronized. Skip`).send();
        return;
      }

      const commitDto = await this.getCommitDto(convertToSFDX);

      await this.commitJob.run(commitDto, this.prefix);

      await this.salesforceSync.setStatus(this.syncData, SyncStatus.Completed);
      await this.updateLastCommit();
      this.sfLogger.log(`${this.prefix} Flosum sync job done.`);
    } catch (error) {
      throw error;
    } finally {
      await this.sfLogger.send();
    }
  }
}
