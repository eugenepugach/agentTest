import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { GithubApiService } from '@/modules/git/providers/api/github-api.service';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { HookDto } from '../dto/hook.dto';
import { GitHookService } from './git-hook.service';

export class GithubHookService extends GitHookService {
  constructor(repository: Repo, private api: GithubApiService) {
    super(repository);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async create(hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const data = await this.request.post('hooks', hookBody);

      return HookDto.fromGithub(data);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async getOne(hookId: string): Promise<HookDto> {
    try {
      const data = await this.request.get(`hooks/${hookId}`);

      return HookDto.fromGithub(data);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<HookDto[]> {
    try {
      const data: unknown = await this.request.get('hooks');

      return (data as any[]).map((hook) => HookDto.fromGithub(hook));
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async update(hookId: string, hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const data = await this.request.patch(`hooks/${hookId}`, hookBody);

      return HookDto.fromGithub(data);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async delete(hookId: string): Promise<void> {
    try {
      await this.request.delete(`hooks/${hookId}`);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
