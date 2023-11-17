import { Constructable } from 'typedi';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { AzureServerCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-server-credentials.dto';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';
import { GithubServerCredentialsDto } from '@/modules/git/providers/credentials/dto/github-server-credentials.dto';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';
import { GitlabServerCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-server-credentials.dto';
import { validate } from 'class-validator';
import { UnprocessableEntityError } from '@/core/errors/unprocessable-entity.error';

const PROVIDER_CREDENTIALS_MAP: Record<GitProvider, Constructable<BaseCredentialsDto>> = {
  [GitProvider.Azure]: AzureCredentialsDto,
  [GitProvider.AzureServer]: AzureServerCredentialsDto,
  [GitProvider.Bitbucket]: BitbucketCredentialsDto,
  [GitProvider.BitbucketServer]: BitbucketServerCredentialsDto,
  [GitProvider.Github]: GithubCredentialsDto,
  [GitProvider.GithubServer]: GithubServerCredentialsDto,
  [GitProvider.Gitlab]: GitlabCredentialsDto,
  [GitProvider.GitlabServer]: GitlabServerCredentialsDto,
};

export class CredentialsFactory {
  public static async createFromConnection(connection: ConnectionDto): Promise<BaseCredentialsDto> {
    if (!(connection.gitProvider in PROVIDER_CREDENTIALS_MAP)) {
      throw new Error(`Unknown git provider '${connection.gitProvider}'`);
    }

    const Dto: any = PROVIDER_CREDENTIALS_MAP[connection.gitProvider];

    const credentialsDto: BaseCredentialsDto = Dto.fromConnectionEnvVariables(connection.envVariables);

    const validationResult = await validate(credentialsDto);

    if (validationResult.length) {
      throw new UnprocessableEntityError(validationResult);
    }

    return credentialsDto;
  }
}
