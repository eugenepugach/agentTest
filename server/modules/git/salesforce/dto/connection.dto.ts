import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { IsBoolean, IsDefined, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Constructable } from 'typedi';
import { Expose } from 'class-transformer';

export class GithubEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubOrganization: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class GithubServerEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubServerUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubServerToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly githubServerOrganization: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @Expose()
  public readonly githubServerUrl: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class GitlabEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitlabUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitlabToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitlabGroupId: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class GitlabServerEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitlabServerUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitlabServerToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly gitlabServerGroupId: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @Expose()
  public readonly gitlabServerUrl: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class BitbucketEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketWorkspace: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketProject: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketClientId: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketClientSecret: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class BitbucketServerEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketServerProject: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketServerUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly bitbucketServerToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @Expose()
  public readonly bitbucketServerUrl: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class AzureEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureOrganization: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureProject: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

export class AzureServerEnvVariablesDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerUsername: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerPassword: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerToken: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerOrganization: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerProject: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly azureServerUrl: string;

  constructor(variables: Record<string, unknown>) {
    for (const key of Object.keys(variables)) {
      (this as any)[key] = variables[key];
    }
  }
}

type EnvVariables =
  | GithubEnvVariablesDto
  | GitlabEnvVariablesDto
  | BitbucketEnvVariablesDto
  | AzureEnvVariablesDto
  | GithubServerEnvVariablesDto
  | GitlabServerEnvVariablesDto
  | BitbucketServerEnvVariablesDto
  | AzureServerEnvVariablesDto;

const ENV_VARIABLES_DTO_MAP: Record<GitProvider, Constructable<EnvVariables>> = {
  [GitProvider.Azure]: AzureEnvVariablesDto,
  [GitProvider.AzureServer]: AzureServerEnvVariablesDto,
  [GitProvider.Bitbucket]: BitbucketEnvVariablesDto,
  [GitProvider.BitbucketServer]: BitbucketServerEnvVariablesDto,
  [GitProvider.Github]: GithubEnvVariablesDto,
  [GitProvider.GithubServer]: GithubServerEnvVariablesDto,
  [GitProvider.Gitlab]: GitlabEnvVariablesDto,
  [GitProvider.GitlabServer]: GitlabServerEnvVariablesDto,
};

export class ConnectionDto {
  @IsDefined()
  @IsBoolean()
  @Expose()
  public readonly isConvertToSfdx: boolean;

  @IsDefined()
  @IsBoolean()
  @Expose()
  public readonly isBidirectionalSynchronization: boolean;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly gitProvider: GitProvider;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Expose()
  public readonly applicationUrl: string;

  @Expose()
  public readonly envVariables: EnvVariables;

  constructor(connection?: Record<string, unknown>) {
    if (connection) {
      for (const key of Object.keys(connection)) {
        (this as any)[key] = connection[key];
      }

      if (connection.envVariables) {
        const EnvVariablesDto = ENV_VARIABLES_DTO_MAP[this.gitProvider];
        if (!EnvVariablesDto) {
          throw new Error(`Unknown git provider '${this.gitProvider}'`);
        }

        // TODO: FIX ENV_VARIABLES VALIDATION

        this.envVariables = new EnvVariablesDto(connection.envVariables);
      }
    }
  }
}
