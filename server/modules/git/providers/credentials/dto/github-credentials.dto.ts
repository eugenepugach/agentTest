import { IsDefined, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { GITHUB_API } from '@/modules/git/providers/providers.constants';
import { GithubEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class GithubCredentialsDto extends BaseCredentialsDto {
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

  public getBaseUrl(): string {
    return GITHUB_API;
  }

  public getAuthorizationHeader(): string {
    return `Bearer ${this.token}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: GithubEnvVariablesDto): BaseCredentialsDto {
    return new GithubCredentialsDto({
      username: variables.githubUsername,
      token: variables.githubToken,
      organization: variables.githubOrganization,
    });
  }
}
