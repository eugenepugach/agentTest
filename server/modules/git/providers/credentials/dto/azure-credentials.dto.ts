import { IsDefined, IsString, IsNotEmpty } from 'class-validator';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';
import { AZURE_API } from '@/modules/git/providers/providers.constants';
import { encodeBase64 } from '@/modules/shared/utils';
import { AzureEnvVariablesDto } from '@/modules/git/salesforce/dto/connection.dto';

export class AzureCredentialsDto extends BaseCredentialsDto {
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

  public getBaseUrl(): string {
    return AZURE_API;
  }

  public getAuthorizationHeader(): string {
    return `Basic ${encodeBase64(`${this.organization}:${this.token}`)}`;
  }

  public getGitShellAuthorizationString(): string {
    return `${encodeURIComponent(this.token)}`;
  }

  public static fromConnectionEnvVariables(variables: AzureEnvVariablesDto): BaseCredentialsDto {
    return new AzureCredentialsDto({
      organization: variables.azureOrganization,
      project: variables.azureProject,
      token: variables.azureToken,
    });
  }
}
