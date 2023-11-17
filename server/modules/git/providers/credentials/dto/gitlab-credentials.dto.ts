import { IsDefined, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { GITLAB_API } from '@/modules/git/providers/providers.constants';
import { GitlabEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class GitlabCredentialsDto extends BaseCredentialsDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly username: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly token: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  public readonly groupId: string;

  public getBaseUrl(): string {
    return GITLAB_API;
  }

  public getAuthorizationHeader(): string {
    return `Bearer ${this.token}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: GitlabEnvVariablesDto): BaseCredentialsDto {
    return new GitlabCredentialsDto({
      username: variables.gitlabUsername,
      token: variables.gitlabToken,
      groupId: variables.gitlabGroupId,
    });
  }
}
