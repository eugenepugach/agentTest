import { IsDefined, IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { joinURL } from '@/modules/shared/utils';
import { GitlabServerEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class GitlabServerCredentialsDto extends BaseCredentialsDto {
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

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  public readonly baseURL: string;

  public getBaseUrl(): string {
    return joinURL(this.baseURL, '/api/v4');
  }

  public getAuthorizationHeader(): string {
    return `Bearer ${this.token}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: GitlabServerEnvVariablesDto): BaseCredentialsDto {
    return new GitlabServerCredentialsDto({
      username: variables.gitlabServerUsername,
      token: variables.gitlabServerToken,
      groupId: variables.gitlabServerGroupId,
      baseURL: variables.gitlabServerUrl,
    });
  }
}
