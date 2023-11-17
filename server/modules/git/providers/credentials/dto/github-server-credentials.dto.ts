import { IsDefined, IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { joinURL } from '@/modules/shared/utils';
import { GithubServerEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class GithubServerCredentialsDto extends BaseCredentialsDto {
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
  public readonly organization: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  public readonly baseURL: string;

  public getBaseUrl(): string {
    return joinURL(this.baseURL, '/api/v3');
  }

  public getAuthorizationHeader(): string {
    return `Bearer ${this.token}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: GithubServerEnvVariablesDto): BaseCredentialsDto {
    return new GithubServerCredentialsDto({
      username: variables.githubServerUsername,
      token: variables.githubServerToken,
      organization: variables.githubServerOrganization,
      baseURL: variables.githubServerUrl,
    });
  }
}
