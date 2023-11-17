import { AzureHookService } from './services/azure-hook.service';
import { GitHookService } from './services/git-hook.service';
import { joinURL } from '../../../shared/utils';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

export class HooksUtils {
  private static readonly API_PATH_TO_GIT_COMMIT_WEBHOOK = '/api/v1/git/devops/git-commit';

  private static createGithubHookPayload(
    provider: GitProvider,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    return {
      name: 'web',
      config: {
        url: this.getHookLinkFor(provider, instanceUrl, connectionId),
        content_type: 'json',
      },
    };
  }

  private static createGitlabHookPayload(
    provider: GitProvider,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    return {
      url: this.getHookLinkFor(provider, instanceUrl, connectionId),
      push_events: true,
    };
  }

  private static createBitbucketHookPayload(
    provider: GitProvider,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    return {
      url: this.getHookLinkFor(provider, instanceUrl, connectionId),
      active: true,
      events: ['repo:push'],
    };
  }

  private static createBitbucketServerHookPayload(
    provider: GitProvider,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    return {
      url: this.getHookLinkFor(provider, instanceUrl, connectionId),
      active: true,
      events: ['repo:refs_changed'],
    };
  }

  private static createAzureHookPayload(
    provider: GitProvider,
    projectId: string,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    return {
      publisherId: 'tfs',
      eventType: 'git.push',
      resourceVersion: '1.0-preview.1',
      consumerId: 'webHooks',
      consumerActionId: 'httpRequest',
      publisherInputs: {
        projectId: projectId,
      },
      consumerInputs: {
        url: this.getHookLinkFor(provider, instanceUrl, connectionId),
      },
    };
  }

  public static getHookLinkFor(provider: GitProvider, instanceUrl: string, connectionId: string): string {
    return joinURL(instanceUrl, `${this.API_PATH_TO_GIT_COMMIT_WEBHOOK}/${provider}/${connectionId}`);
  }

  public static createHookPayload(
    provider: GitProvider,
    hookService: GitHookService,
    instanceUrl: string,
    connectionId: string
  ): Record<string, any> {
    switch (provider) {
      case GitProvider.Github:
      case GitProvider.GithubServer:
        return this.createGithubHookPayload(provider, instanceUrl, connectionId);
      case GitProvider.Gitlab:
      case GitProvider.GitlabServer:
        return this.createGitlabHookPayload(provider, instanceUrl, connectionId);
      case GitProvider.Azure:
      case GitProvider.AzureServer:
        return this.createAzureHookPayload(
          provider,
          (hookService as AzureHookService).getProjectId(),
          instanceUrl,
          connectionId
        );
      case GitProvider.Bitbucket:
        return this.createBitbucketHookPayload(provider, instanceUrl, connectionId);
      case GitProvider.BitbucketServer:
        return this.createBitbucketServerHookPayload(provider, instanceUrl, connectionId);
    }
  }
}
