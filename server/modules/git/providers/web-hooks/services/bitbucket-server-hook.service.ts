import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { BitbucketServerApiService } from '@/modules/git/providers/api/bitbucket-server-api.service';
import { HookDto } from '../dto/hook.dto';
import { GitHookService } from './git-hook.service';

export class BitbucketServerHookService extends GitHookService {
  constructor(repository: Repo, private api: BitbucketServerApiService) {
    super(repository);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async create(hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const hook = await this.request.post('webhooks', hookBody);

      return HookDto.fromBitbucketServer(hook);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async getOne(hookId: string): Promise<HookDto> {
    try {
      const hook = await this.request.get(`webhooks/${hookId}`);

      return HookDto.fromBitbucketServer(hook);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<HookDto[]> {
    try {
      const response: any = await this.request.get('webhooks');

      return response.values.map((hook: any) => HookDto.fromBitbucketServer(hook));
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async update(hookId: string, hookBody: Record<string, any>): Promise<HookDto> {
    try {
      const hook = await this.request.put(`webhooks/${hookId}`, hookBody);

      return HookDto.fromBitbucketServer(hook);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async delete(hookId: string): Promise<void> {
    try {
      await this.request.delete(`webhooks/${hookId}`);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }
}
