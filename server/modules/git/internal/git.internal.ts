import { DEFAULT_GIT_USER_EMAIL, DEFAULT_GIT_USER_NAME, INITIAL_COMMIT } from '@/constants';
import { Logger } from '@/core';
import path from 'path';
import { BranchDto } from '../providers/branches/dto/branch.dto';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { getProtocol } from '../../shared/utils';
import { FS } from './fs.internal';
import {
  extractAuthorFromCommitDescribe,
  extractChangesFromCommitDescribe,
  extractEmailFromCommitDescribe,
  extractMessageFromCommitDescribe,
} from './internal.utils';
import { CommitDescribe } from './types/commit-describe.type';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { ChildProcessUtils } from '@flosum/utils';

export class Git {
  public static readonly DEFAULT_CLONE_PATH = path.join(process.cwd(), '.temp', 'git');
  private static logger = new Logger(Git.name);

  constructor(private _repoPath: string) {}

  public get baseDir(): string {
    return this._repoPath;
  }

  public async setCredentials(name: string, email: string): Promise<void> {
    await ChildProcessUtils.spawnPromise(
      `cd ${this._repoPath} && git config --local user.name "${name}" && git config --local user.email "${email}"`,
      ''
    );
  }

  public async add(...files: string[]): Promise<void> {
    await ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git add ${files.join(' ')}`, '');
  }

  public async status(): Promise<string> {
    return ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git status`, '');
  }

  public async commit(message: string): Promise<void> {
    Git.logger.log('commit message "%s"', message);
    await ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git commit -m "${message}"`, '');
  }

  public async push(branch: string): Promise<void> {
    Git.logger.log('push changes to %s', branch);
    await ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git push origin ${branch} --quiet`, '');
  }

  public async checkout(branch: string): Promise<void> {
    Git.logger.log('checkout to %s', branch);
    await ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git checkout ${branch}`, '');
  }

  public async getCurrentHash(): Promise<string> {
    const hash = await ChildProcessUtils.spawnPromise(`cd ${this._repoPath} && git rev-parse HEAD`, '');

    return hash.replace('\n', '');
  }

  public async describeCommit(commit: string): Promise<CommitDescribe> {
    Git.logger.log('describe commit %s', commit);

    const describe = await ChildProcessUtils.spawnPromise(
      `cd ${this._repoPath} && git show --pretty=format:"Author: %an%nEmail: %ae%nMessage: %s" --name-status ${commit}`,
      ''
    );

    return {
      author: extractAuthorFromCommitDescribe(describe),
      email: extractEmailFromCommitDescribe(describe),
      message: extractMessageFromCommitDescribe(describe),
      changes: extractChangesFromCommitDescribe(describe),
    };
  }

  public static async getRemoteHash(remote: string, branch: string): Promise<string> {
    const [hash] = await ChildProcessUtils.spawnPromise(`git ls-remote ${remote} ${branch} --refs`, '').then((output) =>
      output.replace(/\s/g, ' ').split(' ')
    );

    return hash;
  }

  public static async clone(remote: string, name: string, branch?: string): Promise<Git> {
    const repoPath = path.join(this.DEFAULT_CLONE_PATH, name);
    const git = new Git(repoPath);
    Git.logger.log('clone repository branch %s to %s', branch, repoPath);

    await FS.removeDir(repoPath);

    await ChildProcessUtils.spawnPromise(`git clone -b ${branch} --single-branch ${remote} ${repoPath}`, '');

    return git;
  }

  public static async getRepositoryBranches(repo: Repo, gitCredentials: BaseCredentialsDto): Promise<BranchDto[]> {
    const branchRegexp = /(?:([a-f0-9]+)\s+((?:HEAD|refs\/heads\/).*))/;

    const remote = repo.gitUrl.replace(
      /http(s)?:\/\/(.+@)?/,
      `${getProtocol(repo.gitUrl)}://${gitCredentials.getGitShellAuthorizationString()}@`
    );

    const branchesList = await ChildProcessUtils.spawnPromise(`git ls-remote ${remote}`, '');

    return branchesList
      .split('\n')
      .filter((line) => branchRegexp.test(line))
      .map((line) => {
        const [, sha, name] = line.match(branchRegexp) as RegExpMatchArray;

        const dto = new BranchDto();

        dto.sha = sha;
        dto.name = name.replace('refs/heads/', '');

        return dto;
      });
  }

  public static async createEmptyBranch(
    repo: Repo,
    branch: string,
    message: string,
    gitCredentials: BaseCredentialsDto
  ): Promise<void> {
    const remote = repo.gitUrl.replace(
      /http(s)?:\/\/(.+@)?/,
      `${getProtocol(repo.gitUrl)}://${gitCredentials.getGitShellAuthorizationString()}@`
    );

    const repoPath = path.join(this.DEFAULT_CLONE_PATH, repo.name);

    Git.logger.log('create empty branch at %s name %s [%s]', repo.name, branch, repoPath);

    await FS.removeDir(repoPath);
    await FS.makeDir(repoPath);

    const git = new Git(repoPath);

    await ChildProcessUtils.spawnPromise(`cd ${git.baseDir} && git init`, '');
    await ChildProcessUtils.spawnPromise(`cd ${git.baseDir} && git remote add origin ${remote}`, '');
    await git.setCredentials(DEFAULT_GIT_USER_NAME, DEFAULT_GIT_USER_EMAIL);

    await ChildProcessUtils.spawnPromise(`cd ${git.baseDir} && git checkout --orphan ${branch}`, '');

    await ChildProcessUtils.spawnPromise(
      `cd ${git.baseDir} && git commit -m "${message || INITIAL_COMMIT}" --allow-empty`,
      ''
    );

    await git.push(branch);

    Git.logger.log('clean up repository directory after creating branch');
    await FS.removeDir(git.baseDir);
  }
}
