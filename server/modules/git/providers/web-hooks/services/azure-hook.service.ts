import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { AzureApiService } from '@/modules/git/providers/api/azure-api.service';
import { HookDto } from '../dto/hook.dto';
import { GitHookService } from './git-hook.service';
import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';

export class AzureHookService extends GitHookService {
  private get organization(): string {
    return this.credentials.organization;
  }

  constructor(
    repository: Repo,
    private projectId: string,
    private api: AzureApiService,
    private credentials: AzureCredentialsDto
  ) {
    super(repository);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest();
  }

  public getProjectId(): string {
    return this.projectId;
  }

  public async create(hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const data = await this.request.post(`${this.organization}/_apis/hooks/subscriptions`, hookBody);

      return HookDto.fromAzure(data);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async getOne(hookId: string): Promise<HookDto> {
    try {
      const data = await this.request.get(`${this.organization}/_apis/hooks/subscriptions/${hookId}`);

      return HookDto.fromAzure(data);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<HookDto[]> {
    try {
      const data: any = await this.request.get(`${this.organization}/_apis/hooks/subscriptions`);

      return (data.value as any[])
        .filter((hook) => hook?.publisherInputs?.projectId === this.projectId)
        .map((hook) => HookDto.fromAzure(hook));
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async update(hookId: string, hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const data = await this.request.patch(`${this.organization}/_apis/hooks/subscriptions/${hookId}`, hookBody);

      return HookDto.fromGithub(data);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async delete(hookId: string): Promise<void> {
    try {
      await this.request.delete(`${this.organization}/_apis/hooks/subscriptions/${hookId}`);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
