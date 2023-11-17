import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { HookDto } from '../dto/hook.dto';

export abstract class GitHookService {
  protected request: AxiosInstance;

  constructor(protected repository: Repo) {}

  protected abstract createRequest(): AxiosInstance;

  public abstract create(hookBody: Record<string, any>): Promise<HookDto>;

  public abstract getOne(hookNameOrId: string): Promise<HookDto>;

  public abstract getAll(): Promise<HookDto[]>;

  public abstract update(hookNameOrId: string, hookBody: Record<string, any>): Promise<HookDto>;

  public abstract delete(hookNameOrId: string): Promise<void>;
}
