import { CommitDescribe } from '@/modules/git/internal/types/commit-describe.type';
import { FS } from '../../internal/fs.internal';
import { Git } from '../../internal/git.internal';
import { Shell } from '../../internal/shell.internal';
import { sleep } from '../../../shared/utils';
import { FlosumCommitUserDto } from '../dto/flosum-commit.dto';
import shortid from 'shortid';

export class GitUtils {
  private readonly MAX_GIT_STATUS_CHECK = 10;
  private readonly GIT_STATUS_CHECK_INTERVAL = 3000;
  private git: Git;
  private uniqueId = shortid();

  public get dir(): string {
    return this.git.baseDir;
  }

  constructor(private remote: string) {}

  public async clone(branch: string, _repoName: string): Promise<void> {
    this.git = await Git.clone(this.remote, `${this.uniqueId}`, branch);
  }

  public async checkoutTo(hash: string): Promise<void> {
    await this.git.checkout(hash);
  }

  public getCurrentHash(): Promise<string> {
    return this.git.getCurrentHash();
  }

  public describeCommit(commit: string): Promise<CommitDescribe> {
    return this.git.describeCommit(commit);
  }

  public async commitAndPush(message: string, author: FlosumCommitUserDto, branch: string): Promise<void> {
    await this.git.add('.');

    const status = await this.git.status().catch((error) => error.message || error);

    if (status.includes('nothing to commit')) {
      return;
    }

    await this.git.setCredentials(author.name, author.email);

    try {
      await this.git.commit(message);
    } catch (error) {
      let counter = 0;
      do {
        counter++;
        const status = await this.git.status().catch((error) => error.message || error);

        if (status.includes('nothing to commit')) {
          counter = 0;
          break;
        }

        await sleep(this.GIT_STATUS_CHECK_INTERVAL);
      } while (counter < this.MAX_GIT_STATUS_CHECK);

      if (counter === this.MAX_GIT_STATUS_CHECK) {
        throw error;
      }
    }
    await this.git.push(branch);
  }

  public async clearDir(): Promise<void> {
    // since git can throw an error if nothing to remove we need to catch this kind of errors
    await Shell.exec(`cd ${this.dir} && git rm -rf . && git clean . -fxd`).catch(() => void 0);
  }

  public async removeDir(): Promise<void> {
    await FS.removeDir(this.dir);
  }
}
