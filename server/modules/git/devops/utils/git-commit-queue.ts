import { GitCommitDto } from '../dto/git-commit.dto';
import { CommitsQueue } from './commits-queue';
import { Logger } from '@/core';

export class GitCommitQueue extends CommitsQueue<{ commit: GitCommitDto; connectionId: string }> {
  constructor() {
    super('git.commit');
    this.logger = new Logger(GitCommitQueue.name);
  }

  public add(dto: GitCommitDto, connectionId: string): void {
    const queueKey = `${dto.repository}#${dto.branch}#${connectionId}`;

    this.logger.log('Add new commit to queue "%s"', queueKey);

    this.queue[queueKey] ||= [];
    this.queue[queueKey].push({
      commit: dto,
      connectionId,
    });

    this.run(queueKey);
  }
}
