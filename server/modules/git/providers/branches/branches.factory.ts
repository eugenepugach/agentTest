import { Context } from '@/core';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { Constructable } from 'typedi';
import { AzureBranchService } from '@/modules/git/providers/branches/services/azure-branch.service';
import { BitbucketBranchService } from '@/modules/git/providers/branches/services/bitbucket-branch.service';
import { BitbucketServerBranchService } from '@/modules/git/providers/branches/services/bitbucket-server-branch.service';
import { GithubBranchService } from '@/modules/git/providers/branches/services/github-branch.service';
import { GitlabBranchService } from '@/modules/git/providers/branches/services/gitlab-branch.service';
import { GitBranchService } from '@/modules/git/providers/branches/services/git-branch.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';

const PROVIDER_BRANCHES_MAP: Record<GitProvider, Constructable<GitBranchService>> = {
  [GitProvider.Azure]: AzureBranchService,
  [GitProvider.AzureServer]: AzureBranchService,
  [GitProvider.Bitbucket]: BitbucketBranchService,
  [GitProvider.BitbucketServer]: BitbucketServerBranchService,
  [GitProvider.Github]: GithubBranchService,
  [GitProvider.GithubServer]: GithubBranchService,
  [GitProvider.Gitlab]: GitlabBranchService,
  [GitProvider.GitlabServer]: GitlabBranchService,
};

export class BranchesFactory {
  public static async createFromContext(ctx: Context) {
    return ctx.container.get(PROVIDER_BRANCHES_MAP[ctx.container.get(Tokens.provider) as GitProvider]);
  }
}
