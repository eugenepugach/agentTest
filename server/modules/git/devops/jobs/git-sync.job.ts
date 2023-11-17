import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import Container, { Service } from 'typedi';
import { Logger } from '@/core';
import { GitCommitDto } from '../dto/git-commit.dto';
import { GitSyncDto } from '../dto/git-sync.dto';
import { GitBranchNotFoundError } from '../errors/git-branch-not-found.error';
import { GitCommitJob } from './git-commit.job';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Service()
export class GitSyncJob {
  private readonly logger = new Logger(GitSyncJob.name);
  private sfLogger: SalesforceLogger3;
  private prefix: string;

  private getGitCommitDto(commitDto: GitSyncDto): GitCommitDto {
    const dto = new GitCommitDto();

    dto.repository = commitDto.repository.name;
    dto.branch = commitDto.branch;
    dto.repositoryGit = commitDto.repositoryGit;
    dto.provider = commitDto.provider;
    dto.force = true;

    return dto;
  }

  async run(syncDto: GitSyncDto): Promise<void> {
    this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
    this.prefix = `[GIT -> FLOSUM] [Repository: ${syncDto.repository.name}] [Branch: ${syncDto.branch}]`;

    await this.sfLogger.log(`${this.prefix} Preparing for git sync job.`);

    await this.sfLogger.log(`${this.prefix} Getting branches.`).send();
    const isBranchExists = await syncDto.repository.branches
      .getOne(syncDto.branch)
      .then(() => true)
      .catch(() => false);

    if (!isBranchExists) {
      await this.sfLogger
        .warning(`${this.prefix} Branch "${syncDto.branch}" not exists in git service. Skip...`)
        .send();
      throw new GitBranchNotFoundError();
    }

    try {
      this.sfLogger.log(`${this.prefix} Start Git sync job.`);

      const job = Container.get(GitCommitJob);

      await job.run(this.getGitCommitDto(syncDto));

      this.sfLogger.log(`${this.prefix} Git sync job done.`);
    } catch (error) {
      throw error;
    } finally {
      await this.sfLogger.send();
    }
  }
}
