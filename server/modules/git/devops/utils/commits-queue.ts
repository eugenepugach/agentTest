import { Logger } from '@/core';
import { Child } from '@/modules/git/jobs/child';

export abstract class CommitsQueue<T> {
  protected logger: Logger;
  protected readonly queue: Record<string, T[]> = {};
  private currentJobs: Record<string, Child> = {};

  protected constructor(private readonly childName: 'git.commit' | 'flosum.commit') {}

  protected async run(key: string): Promise<void> {
    if (this.currentJobs[key] || !this.queue[key]) {
      return;
    }

    const data = this.queue[key].shift();

    if (data) {
      this.logger.log('Run commit job "%s"', key);

      try {
        const child = new Child(this.childName);
        this.currentJobs[key] = child;

        await child.execute(
          {
            data,
          },
          true
        );

        delete this.currentJobs[key];
      } catch {
        this.queue[key] = [];
        delete this.currentJobs[key];
      }

      this.logger.log('commit job done for %s', key);

      this.run(key);
    }
  }
}
