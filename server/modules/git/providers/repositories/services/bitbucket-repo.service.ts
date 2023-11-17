import { ERR_BITBUCKET_MISSING_PROJECT, ERR_BITBUCKET_MISSING_WORKSPACE } from '@/constants/errors';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { Inject, Service } from 'typedi';
import { ApiError } from '@/core/errors/api.error';
import { Git } from '../../../internal/git.internal';
import { CreateRepoDto } from '../dto/create-repo.dto';
import { Repo } from '../repo.class';
import { GitRepoService } from './git-repo.service';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Service()
export class BitbucketRepoService extends GitRepoService {
  private readonly workspace: string;
  private readonly project: string;
  private readonly credentials: BitbucketCredentialsDto;

  constructor(
    private api: BitbucketApiService,
    @Inject(Tokens.credentials) bitbucketCredentialsDto: BitbucketCredentialsDto
  ) {
    super(api);

    this.request = api.createRequest();

    this.project = bitbucketCredentialsDto.project;
    this.workspace = bitbucketCredentialsDto.workspace;
    this.credentials = bitbucketCredentialsDto;

    if (!this.workspace) throw new Error(ERR_BITBUCKET_MISSING_WORKSPACE);

    if (!this.project) throw new Error(ERR_BITBUCKET_MISSING_PROJECT);
  }

  public async create(repoBody: CreateRepoDto): Promise<Repo> {
    try {
      const { name } = repoBody;

      const createRepoBody = {
        name: repoBody.name,
        is_private: repoBody.private,
        ...(repoBody.apiBody || {}),
        project: {
          key: this.project,
        },
      };

      const data = await this.request.post(`/repositories/${this.workspace}/${name.toLowerCase()}`, createRepoBody);

      const repo = Repo.fromBitbucket(data, this.api, this.credentials);

      if (repoBody.autoInit) {
        await Git.createEmptyBranch(repo, repoBody.defaultBranch || 'master', '', this.credentials);
        repo.defaultBranch = repoBody.defaultBranch || 'master';
      }

      return repo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }

  public async getAll(): Promise<Repo[]> {
    try {
      const repositories: any[] = [];

      let data: any;

      do {
        data = await this.request.get(data ? data.next : `repositories/${this.workspace}`);

        repositories.push(...data.values);
      } while (data.next);

      return repositories.map((repository) => Repo.fromBitbucket(repository, this.api, this.credentials));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async getOne(repoName: string): Promise<Repo> {
    try {
      const data: any = await this.request.get(`repositories/${this.workspace}/${repoName.toLowerCase()}`);

      return Repo.fromBitbucket(data, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async update(repoName: string, repoBody: Record<string, any>): Promise<Repo> {
    // due bitbucket create a new repository each time we want to update non-existed repository
    // weshould check if it repository exists
    await this.getOne(repoName);

    try {
      const data: any = await this.request.put(`repositories/${this.workspace}/${repoName.toLowerCase()}`, repoBody);

      return Repo.fromBitbucket(data, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async delete(repoName: string): Promise<void> {
    try {
      await this.request.delete(`repositories/${this.workspace}/${repoName.toLowerCase()}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }
}
