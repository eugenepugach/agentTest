import { IsDefined, IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { encodeBase64 } from '@/modules/shared/utils';
import { AzureServerEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';
import { CustomUri } from '../utils/custom-uri';

export class AzureServerCredentialsDto extends BaseCredentialsDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly organization: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly project: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly token: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly username: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  public readonly password: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  public readonly baseURL: string;

  public getBaseUrl(): string {
    return this.baseURL;
  }

  public getAuthorizationHeader(): string {
    return `Basic ${encodeBase64(`${this.username}:${this.token}`)}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.username)}:${CustomUri.encode(this.password)}`;
  }

  public static fromConnectionEnvVariables(variables: AzureServerEnvVariablesDto): BaseCredentialsDto {
    return new AzureServerCredentialsDto({
      organization: variables.azureServerOrganization,
      token: variables.azureServerToken,
      project: variables.azureServerProject,
      username: variables.azureServerUsername,
      password: variables.azureServerPassword,
      baseURL: variables.azureServerUrl,
    });
  }
}
