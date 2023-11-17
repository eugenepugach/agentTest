import { Exclude } from 'class-transformer';
import { AzureBranchService } from '../branches/services/azure-branch.service';
import { BitbucketBranchService } from '../branches/services/bitbucket-branch.service';
import { BitbucketServerBranchService } from '../branches/services/bitbucket-server-branch.service';
import { GitBranchService } from '../branches/services/git-branch.service';
import { GithubBranchService } from '../branches/services/github-branch.service';
import { GitlabBranchService } from '../branches/services/gitlab-branch.service';
import { AzureHookService } from '@/modules/git/providers/web-hooks/services/azure-hook.service';
import { BitbucketHookService } from '@/modules/git/providers/web-hooks/services/bitbucket-hook.service';
import { BitbucketServerHookService } from '@/modules/git/providers/web-hooks/services/bitbucket-server-hook.service';
import { GitHookService } from '@/modules/git/providers/web-hooks/services/git-hook.service';
import { GithubHookService } from '@/modules/git/providers/web-hooks/services/github-hook.service';
import { GitlabHookService } from '@/modules/git/providers/web-hooks/services/gitlab-hook.service';
import { GitlabApiService } from '@/modules/git/providers/api/gitlab-api.service';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { AzureApiService } from '@/modules/git/providers/api/azure-api.service';
import { BitbucketServerApiService } from '@/modules/git/providers/api/bitbucket-server-api.service';
import { GithubApiService } from '@/modules/git/providers/api/github-api.service';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';
import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';

export class Repo {
  @Exclude()
  public branches: GitBranchService;

  @Exclude()
  public hooks: GitHookService;

  public name: string;
  public fullName: string;
  public private: boolean;
  public defaultBranch: string;
  public sshUrl: string;
  public gitUrl: string;
  public apiUrl: string;

  public static fromAzure(body: Record<string, any>, api: AzureApiService, credentials: AzureCredentialsDto): Repo {
    const repo = new Repo();

    repo.name = body.name;
    repo.fullName = body.name;
    repo.private = body.project?.visibility === 'private';
    repo.defaultBranch = body.defaultBranch?.replace('refs/heads/', '');
    repo.sshUrl = body.sshUrl;
    repo.gitUrl = body.remoteUrl;
    repo.apiUrl = body._links?.self?.href || body.url;
    repo.branches = new AzureBranchService(repo, api, credentials);
    repo.hooks = new AzureHookService(repo, body.project?.id, api, credentials);

    return repo;
  }

  public static fromBitbucketServer(
    body: Record<string, any>,
    apiUrl: string,
    api: BitbucketServerApiService,
    credentials: BitbucketServerCredentialsDto
  ): Repo {
    const repo = new Repo();

    repo.name = body.name;
    repo.private = !body.public;
    repo.defaultBranch = body.mainbranch?.name;
    repo.sshUrl = body.links.clone?.find((link: any) => link.name === 'ssh')?.href;
    repo.gitUrl = body.links.clone?.find((link: any) => /^http(s)?/.test(link.name))?.href;
    repo.fullName = body.full_name || repo.name;
    repo.apiUrl = apiUrl;
    repo.branches = new BitbucketServerBranchService(repo, api, credentials);
    repo.hooks = new BitbucketServerHookService(repo, api);

    return repo;
  }

  public static fromBitbucket(
    body: Record<string, any>,
    api: BitbucketApiService,
    credentials: BitbucketCredentialsDto
  ): Repo {
    const repo = new Repo();

    repo.name = body.name;
    repo.private = body.is_private;
    repo.defaultBranch = body.mainbranch?.name;
    repo.sshUrl = body.links.clone?.find((link: any) => link.name === 'ssh')?.href;
    repo.gitUrl = body.links.clone?.find((link: any) => link.name === 'https')?.href;
    repo.fullName = body.full_name;
    repo.apiUrl = body.links.self.href;
    repo.branches = new BitbucketBranchService(repo, api, credentials);
    repo.hooks = new BitbucketHookService(repo, api);

    return repo;
  }

  public static fromGitlab(body: Record<string, any>, api: GitlabApiService, credentials: GitlabCredentialsDto): Repo {
    const repo = new Repo();

    repo.name = body.name;
    repo.private = body.visibility === 'private';
    repo.defaultBranch = body.default_branch;
    repo.sshUrl = body.ssh_url_to_repo;
    repo.gitUrl = body.http_url_to_repo;
    repo.fullName = body.path_with_namespace;
    repo.apiUrl = body._links.self;
    repo.branches = new GitlabBranchService(repo, api, credentials);
    repo.hooks = new GitlabHookService(repo, api);

    return repo;
  }

  public static fromGithub(body: Record<string, any>, api: GithubApiService, credentials: GithubCredentialsDto): Repo {
    const repo = new Repo();

    repo.name = body.name;
    repo.private = body.private;
    repo.defaultBranch = body.default_branch;
    repo.sshUrl = body.ssh_url;
    repo.gitUrl = body.clone_url;
    repo.fullName = body.full_name;
    repo.apiUrl = body.url;
    repo.branches = new GithubBranchService(repo, api, credentials);
    repo.hooks = new GithubHookService(repo, api);

    return repo;
  }
}
