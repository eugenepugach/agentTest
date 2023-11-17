import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { Inject, Service } from 'typedi';
import { ApiError } from '@/core/errors/api.error';
import { BitbucketServerApiService } from '@/modules/git/providers/api/bitbucket-server-api.service';
import { Git } from '../../../internal/git.internal';
import { joinURL } from '@/modules/shared/utils';
import { CreateRepoDto } from '../dto/create-repo.dto';
import { Repo } from '../repo.class';
import { GitRepoService } from './git-repo.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';

@Service()
export class BitbucketServerRepoService extends GitRepoService {
  private readonly project: string;
  private readonly credentials: BitbucketServerCredentialsDto;

  constructor(
    private api: BitbucketServerApiService,
    @Inject(Tokens.credentials) bitbucketServerCredentials: BitbucketServerCredentialsDto
  ) {
    super(api);
    this.project = bitbucketServerCredentials.project;
    this.credentials = bitbucketServerCredentials;
  }

  public async create(repoBody: CreateRepoDto): Promise<Repo> {
    try {
      const createRepoBody = {
        name: repoBody.name,
        scmId: 'git',
        defaultBranch: repoBody.defaultBranch,
        ...(repoBody.apiBody || {}),
      };

      const createdRepo = await this.request.post(`projects/${this.project}/repos`, createRepoBody);

      const repository = Repo.fromBitbucketServer(createdRepo, '', this.api, this.credentials);

      if (repoBody.autoInit) {
        await Git.createEmptyBranch(repository, repoBody.defaultBranch || 'master', '', this.credentials);
      }

      return this.getOne(repository.name);
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
        data = await this.request.get(`projects/${this.project}/repos`, {
          params: {
            limit: 100,
            start: data ? data.nextPageStart : 0,
          },
        });

        repositories.push(...data.values);
      } while (!data.isLastPage);

      return repositories.map((repository) =>
        Repo.fromBitbucketServer(
          repository,
          joinURL(this.request.defaults.baseURL || '', `/projects/${this.project}/repos/${repository.slug}`),
          this.api,
          this.credentials
        )
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async getOne(repoName: string): Promise<Repo> {
    try {
      const repository: any = await this.request.get(`projects/${this.project}/repos/${repoName}`);

      const repo = Repo.fromBitbucketServer(
        repository,
        joinURL(this.request.defaults.baseURL || '', `/projects/${this.project}/repos/${repoName}`),
        this.api,
        this.credentials
      );

      const branches: any[] = await this.request.get(repo.apiUrl + '/branches').then((data: any) => data.values);

      repo.defaultBranch = branches.find((branch) => branch.isDefault === true)?.displayId;

      return repo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async update(repoName: string, repoBody: Record<string, any>): Promise<Repo> {
    try {
      const repository = await this.request.put(`projects/${this.project}/repos/${repoName}`, repoBody);

      const defaultBranch: any = await this.request.get(`projects/${this.project}/repos/${repoName}/default-branch`);

      const repo = Repo.fromBitbucketServer(
        repository,
        joinURL(this.request.defaults.baseURL || '', `/projects/${this.project}/repos/${repoName}`),
        this.api,
        this.credentials
      );

      repo.defaultBranch = defaultBranch.displayId;

      return repo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async delete(repoName: string): Promise<void> {
    try {
      await this.getOne(repoName);

      await this.request.delete(`projects/${this.project}/repos/${repoName}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }
}
