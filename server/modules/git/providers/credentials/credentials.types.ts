import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';
import { AzureServerCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-server-credentials.dto';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';
import { GithubServerCredentialsDto } from '@/modules/git/providers/credentials/dto/github-server-credentials.dto';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';
import { GitlabServerCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-server-credentials.dto';

export type Credentials =
  | AzureCredentialsDto
  | AzureServerCredentialsDto
  | BitbucketCredentialsDto
  | BitbucketServerCredentialsDto
  | GithubCredentialsDto
  | GithubServerCredentialsDto
  | GitlabCredentialsDto
  | GitlabServerCredentialsDto;
