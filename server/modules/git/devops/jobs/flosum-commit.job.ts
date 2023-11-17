import { Logger } from '@/core';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { SalesforceService } from '@/modules/git/salesforce/services/salesforce.service';
import { Container, Service } from 'typedi';
import { ERR_INVALID_SYNC_RECORD_ID, ERR_UNKNOWN_SYNC_RECORD_ID } from '@/constants/errors';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { AnyType } from '@/core/types/any.type';
import { BranchDto } from '../../providers/branches/dto/branch.dto';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { FlosumRepositorySyncDto } from '../../salesforce/dto/flosum-repository-sync.dto';
import { SyncStatus } from '../../salesforce/enums/sync-status.enum';
import { SalesforceRetrieverService } from '../../salesforce/services/salesforce-retriever.service';
import { SalesforceSyncService } from '../../salesforce/services/salesforce-sync.service';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { DeletedComponent } from '../../salesforce/types/deleted-component.type';
import { CommitComponentsDto } from '../dto/commit-components.dto';
import { FlosumCommitDto } from '../dto/flosum-commit.dto';
import { RemoteState } from '../types/remote-state.type';
import { CommitComponentsJob } from './commit-components.job';
import { FLOSUM_ATTACHMENT } from '@/constants';
import shortid from 'shortid';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GitRepoService } from '@/modules/git/providers/repositories/services/git-repo.service';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';

@Service({
  transient: true,
})
export class FlosumCommitJob {
  private repoService: GitRepoService;
  private readonly logger = new Logger(FlosumCommitJob.name);
  private commitData: FlosumCommitDto;
  private repositoryData: FlosumRepositorySyncDto;
  private repository: Repo;
  private branch: BranchDto;
  private sfLogger: SalesforceLogger3;
  private gitApiService: GitApiService<any>;
  private config: ConnectionDto;
  private prefix: string;

  constructor(
    private salesforceService: SalesforceService,
    private commitJob: CommitComponentsJob,
    private salesforceSync: SalesforceSyncService
  ) {}

  private async fetchRepositoryData(): Promise<void> {
    try {
      if (this.commitData.syncRepositoryId) {
        this.repositoryData = await this.salesforceSync.getRepositoryRecord(this.commitData.syncRepositoryId);
      } else if (this.commitData.syncBranchId) {
        this.repositoryData = await this.salesforceSync.getBranchRecord(this.commitData.syncBranchId);
      }
    } catch {
      throw new BadRequestError(ERR_INVALID_SYNC_RECORD_ID);
    }
  }

  private async getComponentsToWrite(): Promise<FlosumComponent[]> {
    if (!this.commitData.commitAttachmentId) {
      return [];
    }

    await this.salesforceService.patchObject(FLOSUM_ATTACHMENT, this.commitData.commitAttachmentId, {
      Name: shortid(),
    });

    const retrievedComponentIds = await this.salesforceService
      .retrieveAttachment<string>(this.commitData.commitAttachmentId)
      .then((rawIds) => rawIds.split(' ').map((id) => id.trim()));

    await this.salesforceService.deleteAttachment(this.commitData.commitAttachmentId);

    const retriever = new SalesforceRetrieverService(this.salesforceService);

    return await retriever.run(retrievedComponentIds);
  }

  private async getComponentsToDelete(): Promise<DeletedComponent[]> {
    if (!this.commitData.deleteAttachmentId) {
      return [];
    }

    await this.salesforceService.patchObject(FLOSUM_ATTACHMENT, this.commitData.deleteAttachmentId, {
      Name: shortid(),
    });

    const retrievedComponents = await this.salesforceService.retrieveAttachment<DeletedComponent[]>(
      this.commitData.deleteAttachmentId
    );

    await this.salesforceService.deleteAttachment(this.commitData.deleteAttachmentId);

    return retrievedComponents;
  }

  private async getCommitDto(): Promise<CommitComponentsDto> {
    const commitDto = new CommitComponentsDto();

    const [writed, deleted] = await Promise.all([this.getComponentsToWrite(), this.getComponentsToDelete()]);

    commitDto.message = this.commitData.message;
    commitDto.user = this.commitData.user;
    commitDto.components = {
      writed,
      deleted,
    };
    commitDto.convertToSFDX = this.config.isConvertToSfdx;
    commitDto.repo = this.repository;
    commitDto.branch = this.branch;
    commitDto.provider = this.config.gitProvider;

    return commitDto;
  }

  private async updateLastCommit(reset = false): Promise<void> {
    if (reset) {
      await this.salesforceSync.updateRemoteState(this.repositoryData, {});
    } else {
      const branch = await this.repository.branches.getOne(this.branch.name);

      this.sfLogger.log(`${this.prefix} Update remote state.`);

      const remoteState: RemoteState = {
        [this.repository.gitUrl]: { lastCommit: branch.sha },
      };
      await this.salesforceSync.updateRemoteState(this.repositoryData, remoteState);
    }
  }

  private async exec(): Promise<void> {
    const commitDto = await this.getCommitDto();

    await this.salesforceSync.setStatus(this.repositoryData, SyncStatus.InProgress);
    await this.commitJob.run(commitDto, this.prefix);
    await this.updateLastCommit();

    await this.salesforceSync.setStatus(this.repositoryData, SyncStatus.Completed);
  }

  private async handleCommitJobError(error: AnyType): Promise<void> {
    try {
      this.sfLogger.error(`${error}`);
      await this.sfLogger.send();
      await this.updateLastCommit(true);
      await this.salesforceSync.setStatus(this.repositoryData, SyncStatus.Error);
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async run(commit: FlosumCommitDto): Promise<void> {
    try {
      this.commitData = commit;

      this.gitApiService = Container.get(Tokens.gitApiService) as GitApiService<any>;
      this.repoService = Container.get(Tokens.gitRepoService) as GitRepoService;

      this.config = Container.get(Tokens.config) as ConnectionDto;

      await this.fetchRepositoryData();

      this.repository = await this.repoService.getOne(this.repositoryData.repositoryName);
      this.branch = await this.repository.branches.getOne(this.repositoryData.branchName);

      this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
      this.prefix = `[FLOSUM -> GIT] [${this.config.gitProvider.toUpperCase()}] [Repository: ${
        this.repositoryData.repositoryName
      }] [Branch: ${this.repositoryData.branchName}] [${FlosumCommitJob.name}]`;

      if (!this.repositoryData) {
        throw new BadRequestError(ERR_UNKNOWN_SYNC_RECORD_ID);
      }

      await this.sfLogger.log(`${this.prefix} Start Flosum commit job.`).send();

      await this.exec().catch((error) => this.handleCommitJobError(error));
    } catch (error) {
      this.commitData = undefined as any;

      this.logger.error(error);

      throw error;
    }
  }
}
