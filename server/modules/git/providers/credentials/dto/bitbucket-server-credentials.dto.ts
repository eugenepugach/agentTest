import { IsDefined, IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { encodeBase64, joinURL } from '@/modules/shared/utils';
import { BitbucketServerEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class BitbucketServerCredentialsDto extends BaseCredentialsDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly project: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly username: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly token: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  public readonly baseURL: string;

  public getBaseUrl(): string {
    return joinURL(this.baseURL, '/rest/api/1.0/');
  }

  public getAuthorizationHeader(): string {
    return `Basic ${encodeBase64(`${this.username}:${this.token}`)}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: BitbucketServerEnvVariablesDto): BaseCredentialsDto {
    return new BitbucketServerCredentialsDto({
      project: variables.bitbucketServerProject,
      username: variables.bitbucketServerUsername,
      token: variables.bitbucketServerToken,
      baseURL: variables.bitbucketServerUrl,
    });
  }
}
