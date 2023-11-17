import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { AzureApiService } from '@/modules/git/providers/api/azure-api.service';
import { Inject, Service } from 'typedi';
import { ApiError } from '@/core/errors/api.error';
import { Git } from '../../../internal/git.internal';
import { CreateRepoDto } from '../dto/create-repo.dto';
import { Repo } from '../repo.class';
import { GitRepoService } from './git-repo.service';
import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Service()
export class AzureRepoService extends GitRepoService {
  private readonly organization: string;
  private readonly project: string;
  private readonly credentials: AzureCredentialsDto;

  constructor(private api: AzureApiService, @Inject(Tokens.credentials) azureCredentials: AzureCredentialsDto) {
    super(api);
    this.organization = azureCredentials.organization;
    this.project = azureCredentials.project;
    this.credentials = azureCredentials;
    this.request.defaults.baseURL = `${this.request.defaults.baseURL}/${this.organization}/${this.project}/_apis/git`;
  }

  public async create(repoBody: CreateRepoDto): Promise<Repo> {
    try {
      const data = await this.request.post(`repositories`, repoBody);

      const repo = Repo.fromAzure(data, this.api, this.credentials);

      if (repoBody.autoInit) {
        await Git.createEmptyBranch(repo, repoBody.defaultBranch || 'master', '', this.credentials);
      }

      return this.getOne(repo.name);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }

  public async getOne(repoName: string): Promise<Repo> {
    try {
      const data = await this.request.get(`repositories/${repoName}`);

      return Repo.fromAzure(data, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<Repo[]> {
    try {
      const data: any = await this.request.get(`repositories`);

      return (data.value as any[]).map((repository) => Repo.fromAzure(repository, this.api, this.credentials));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async update(repoName: string, repoBody: Record<string, any>): Promise<Repo> {
    try {
      const repo = await this.getOne(repoName);
      const data = await this.request.patch(repo.apiUrl, repoBody);

      return Repo.fromAzure(data, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }

  public async delete(repoName: string): Promise<void> {
    try {
      const repository: { id: string } = await this.request.get(`repositories/${repoName}`);
      await this.request.delete(`repositories/${repository.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }
}
