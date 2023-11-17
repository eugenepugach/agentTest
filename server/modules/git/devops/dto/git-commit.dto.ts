import { ERR_UNSUPPORTED_EVENT } from '@/constants/errors';
import { Context } from '@/core';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { GitChanges } from '@/modules/git/internal/types/git-changes.type';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

export type GitCommit = {
  id: string;
  username?: string;
  email?: string;
  message?: string;
  files?: GitChanges;
};

export class GitCommitDto {
  public provider: GitProvider;
  public repository: string;
  public branch: string;
  public repositoryGit: string;
  public username: string;
  public fileNames: string[];
  public commits: GitCommit[];
  public force = false;

  public static fromBitbucketServer(ctx: Context): GitCommitDto {
    if (ctx.req.headers['x-event-key'] !== 'repo:refs_changed') {
      throw new BadRequestError(ERR_UNSUPPORTED_EVENT);
    }

    const dto = new GitCommitDto();

    const body = ctx.req.body;

    dto.repository = body.repository.name;
    dto.branch = body.changes[0].refId.replace('refs/heads/', '');
    dto.repositoryGit = body.repository.links.clone?.find((link: any) =>
      (link.name as string).startsWith('http')
    )?.href;
    dto.username = body.actor.displayName;
    dto.commits = (body.changes as any[]).map((commit) => ({
      id: commit.toHash,
    }));

    return dto;
  }

  public static fromBitbucket(ctx: Context): GitCommitDto {
    if (ctx.req.headers['x-event-key'] !== 'repo:push') {
      throw new BadRequestError(ERR_UNSUPPORTED_EVENT);
    }

    const dto = new GitCommitDto();

    const body = ctx.req.body;

    dto.repository = body.repository.name;
    dto.branch = body.push.changes[0].new.name.replace('refs/heads/', '');
    dto.repositoryGit = body.repository.links.html.href + '.git';
    dto.username = '';
    dto.commits = (body.push.changes as any[]).map((change) => ({
      id: change.new.target.hash,
    }));

    return dto;
  }

  public static fromAzure(ctx: Context): GitCommitDto {
    if (ctx.req.body.eventType !== 'git.push') {
      throw new BadRequestError(ERR_UNSUPPORTED_EVENT);
    }

    const dto = new GitCommitDto();

    const body = ctx.req.body.resource;

    dto.repository = body.repository.name;
    dto.branch = body.refUpdates[0].name.replace('refs/heads/', '');
    dto.repositoryGit = body.repository.remoteUrl;
    dto.username = body.pushedBy.displayName;
    dto.commits = (body.commits as any[]).map((commit) => ({
      id: commit.commitId,
    }));

    return dto;
  }

  public static fromGitlab(ctx: Context): GitCommitDto {
    if (ctx.req.headers['x-gitlab-event'] !== 'Push Hook') {
      throw new BadRequestError(ERR_UNSUPPORTED_EVENT);
    }

    const dto = new GitCommitDto();

    const body = ctx.req.body;

    dto.repository = body.repository.name;
    dto.branch = body.ref.replace('refs/heads/', '');
    dto.repositoryGit = body.repository.git_http_url;
    dto.username = body.user_username;
    dto.commits = (body.commits as any[]).map((commit) => ({
      id: commit.id,
    }));

    return dto;
  }

  public static fromGithub(ctx: Context): GitCommitDto {
    if (ctx.req.headers['x-github-event'] !== 'push') {
      throw new BadRequestError(ERR_UNSUPPORTED_EVENT);
    }

    const dto = new GitCommitDto();

    const body = ctx.req.body;

    dto.repository = body.repository.name;
    dto.branch = body.ref.replace('refs/heads/', '');
    dto.repositoryGit = body.repository.clone_url;
    dto.username = body.pusher.name;
    dto.commits = (body.commits as any[]).map((commit) => ({
      id: commit.id,
    }));

    return dto;
  }
}
