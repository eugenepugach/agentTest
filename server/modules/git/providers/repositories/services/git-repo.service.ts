import { GitApiService } from '@/modules/git/providers/api/git-api.service';
import { AxiosInstance } from 'axios';
import { CreateRepoDto } from '@/modules/git/providers/repositories/dto/create-repo.dto';
import { Repo } from '../repo.class';

export abstract class GitRepoService {
  protected request: AxiosInstance;

  protected constructor(private gitApiService: GitApiService<any>) {
    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    const request = this.gitApiService.createRequest();

    return request;
  }

  public abstract create(repoBody: CreateRepoDto): Promise<Repo>;

  public abstract getOne(repoName: string): Promise<Repo>;

  public abstract getAll(): Promise<Repo[]>;

  public abstract update(repoName: string, repoBody: Record<string, any>): Promise<Repo>;

  public abstract delete(repoName: string): Promise<void>;
}
