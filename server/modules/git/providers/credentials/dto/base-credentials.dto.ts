export abstract class BaseCredentialsDto {
  public abstract getBaseUrl(): string;
  public abstract getAuthorizationHeader(): string;
  public abstract getGitShellAuthorizationString(): string;
  public static fromConnectionEnvVariables(_variables: Record<string, any>): BaseCredentialsDto {
    throw new Error('Not implemented');
  }

  constructor(credentials: Record<string, unknown>) {
    for (const key of Object.keys(credentials)) {
      (this as any)[key] = credentials[key];
    }
  }
}
