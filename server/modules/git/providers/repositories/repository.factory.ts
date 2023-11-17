import { Constructable, Container, ContainerInstance } from 'typedi';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { GitRepoService } from '@/modules/git/providers/repositories/services/git-repo.service';
import { GithubRepoService } from '@/modules/git/providers/repositories/services/github-repo.service';
import { GitlabRepoService } from '@/modules/git/providers/repositories/services/gitlab-repo.service';
import { BitbucketRepoService } from '@/modules/git/providers/repositories/services/bitbucket-repo.service';
import { BitbucketServerRepoService } from '@/modules/git/providers/repositories/services/bitbucket-server-repo.service';
import { AzureRepoService } from '@/modules/git/providers/repositories/services/azure-repo.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';

const PROVIDER_REPOSITORY_MAP: Record<GitProvider, Constructable<GitRepoService>> = {
  [GitProvider.Azure]: AzureRepoService,
  [GitProvider.AzureServer]: AzureRepoService,
  [GitProvider.Bitbucket]: BitbucketRepoService,
  [GitProvider.BitbucketServer]: BitbucketServerRepoService,
  [GitProvider.Github]: GithubRepoService,
  [GitProvider.GithubServer]: GithubRepoService,
  [GitProvider.Gitlab]: GitlabRepoService,
  [GitProvider.GitlabServer]: GitlabRepoService,
};

export class RepositoryFactory {
  public static async createFromContext(container: typeof Container | ContainerInstance): Promise<GitRepoService> {
    return container.get(PROVIDER_REPOSITORY_MAP[container.get(Tokens.provider) as GitProvider]);
  }
}
