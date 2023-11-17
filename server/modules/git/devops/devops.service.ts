import { Context } from '@/core';
import { Service } from 'typedi';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { Child } from '@/modules/git/jobs/child';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { FlosumCommitDto } from './dto/flosum-commit.dto';
import { GitCommitQueue } from './utils/git-commit-queue';
import { extractGitCommitDtoFromContext } from './utils/git-commit.utils';
import { FlosumCommitQueue } from '@/modules/git/devops/utils/flosum-commit-queue';

@Service()
export class DevopsService {
  private readonly gitCommitQueue = new GitCommitQueue();
  private readonly flosumCommitQueue = new FlosumCommitQueue();
  private syncProcess: Map<string, Child> = new Map<string, Child>();

  async createFlosumCommit(commit: FlosumCommitDto, loggerId: string, connectionId: string): Promise<void> {
    this.flosumCommitQueue.add(commit, loggerId, connectionId);
  }

  async abortSync(loggerId: string, connectionId: string): Promise<void> {
    if (this.syncProcess) {
      this.syncProcess.get(connectionId)?.kill();
      this.syncProcess.delete(connectionId);
    }

    const abortSyncChild = new Child('disable.sync');

    abortSyncChild.execute({
      data: {
        loggerId,
        connectionId,
      },
    });
  }

  async createSync(loggerId: string, connectionId: string): Promise<void> {
    if (this.syncProcess.has(connectionId)) {
      throw new BadRequestError('Sync process already started!');
    }

    this.syncProcess.set(connectionId, new Child('sync.child'));

    this.syncProcess
      .get(connectionId)
      ?.execute(
        {
          data: {
            loggerId,
            connectionId,
          },
        },
        true
      )
      .then(() => {
        this.syncProcess.delete(connectionId);
      });
  }

  createGitCommit(ctx: Context, provider: GitProvider, connectionId: string): void {
    this.gitCommitQueue.add(extractGitCommitDtoFromContext(ctx, provider), connectionId);
  }
}
