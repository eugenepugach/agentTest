import { IsDefined, IsString, IsNotEmpty } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { BITBUCKET_API } from '@/modules/git/providers/providers.constants';
import { BitbucketEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class BitbucketCredentialsDto extends BaseCredentialsDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly workspace: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly project: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly clientId: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly clientSecret: string;

  private _accessToken: string;

  public getBaseUrl(): string {
    return BITBUCKET_API;
  }

  public getAuthorizationHeader(): string {
    return `Bearer ${this._accessToken}`;
  }

  public getGitShellAuthorizationString(): string {
    return `x-token-auth:${encodeURIComponent(this._accessToken)}`;
  }

  public static fromConnectionEnvVariables(variables: BitbucketEnvVariablesDto): BaseCredentialsDto {
    return new BitbucketCredentialsDto({
      workspace: variables.bitbucketWorkspace,
      project: variables.bitbucketProject,
      clientId: variables.bitbucketClientId,
      clientSecret: variables.bitbucketClientSecret,
    });
  }

  public setAccessToken(value: string): void {
    this._accessToken = value;
  }

  public getAccessToken() {
    return this._accessToken;
  }
}
