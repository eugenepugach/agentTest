import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { GitlabApiService } from '@/modules/git/providers/api/gitlab-api.service';
import { GithubApiService } from '@/modules/git/providers/api/github-api.service';
import { AzureApiService } from '@/modules/git/providers/api/azure-api.service';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { BitbucketServerApiService } from '@/modules/git/providers/api/bitbucket-server-api.service';
import { Constructable, Container, ContainerInstance } from 'typedi';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';

const PROVIDER_SERVICES_MAP: Record<GitProvider, Constructable<GitApiService<any>>> = {
  [GitProvider.Gitlab]: GitlabApiService,
  [GitProvider.GitlabServer]: GitlabApiService,
  [GitProvider.Github]: GithubApiService,
  [GitProvider.GithubServer]: GithubApiService,
  [GitProvider.Bitbucket]: BitbucketApiService,
  [GitProvider.BitbucketServer]: BitbucketServerApiService,
  [GitProvider.Azure]: AzureApiService,
  [GitProvider.AzureServer]: AzureApiService,
};

export class ServicesFactory {
  public static createFromProvider(
    container: typeof Container | ContainerInstance,
    gitProvider: GitProvider
  ): GitApiService<any> {
    if (!(gitProvider in PROVIDER_SERVICES_MAP)) {
      throw new Error(`Unknown git provider '${gitProvider}'`);
    }

    return container.get(PROVIDER_SERVICES_MAP[gitProvider]);
  }
}
