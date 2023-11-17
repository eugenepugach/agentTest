import { FlosumCommitDto } from '@/modules/git/devops/dto/flosum-commit.dto';
import { CommitsQueue } from '@/modules/git/devops/utils/commits-queue';
import { Logger } from '@/core';
import { getLastArrayItem } from '@/modules/shared/utils';

export class FlosumCommitQueue extends CommitsQueue<{
  commit: FlosumCommitDto;
  loggerId: string;
  connectionId: string;
}> {
  constructor() {
    super('flosum.commit');
    this.logger = new Logger(FlosumCommitQueue.name);
  }

  public add(dto: FlosumCommitDto, loggerId: string, connectionId: string): void {
    const queueKey = `${dto.syncRepositoryId}#${dto.syncBranchId}#${connectionId}`;

    this.logger.log('add new commit to queue "%s"', queueKey);

    this.queue[queueKey] ||= [];

    const lastQueueItem = getLastArrayItem(this.queue[queueKey]);

    if (dto.isSingleOperation && this.queue[queueKey].length && lastQueueItem.commit.isSingleOperation) {
      if (lastQueueItem.commit.isSingleOperation) {
        lastQueueItem.commit.commitAttachmentId ||= dto.commitAttachmentId;
        lastQueueItem.commit.deleteAttachmentId ||= dto.deleteAttachmentId;
      }
    } else {
      this.queue[queueKey].push({
        commit: dto,
        loggerId,
        connectionId,
      });
    }

    this.run(queueKey);
  }
}
