import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { GithubApiService } from '@/modules/git/providers/api/github-api.service';
import { Inject, Service } from 'typedi';
import { ApiError } from '@/core/errors/api.error';
import { Git } from '../../../internal/git.internal';
import { joinURL } from '@/modules/shared/utils';
import { CreateRepoDto } from '@/modules/git/providers/repositories/dto/create-repo.dto';
import { Repo } from '../repo.class';
import { GitRepoService } from './git-repo.service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';

@Service()
export class GithubRepoService extends GitRepoService {
  private readonly organization: string;
  private readonly username: string;
  private readonly credentials: GithubCredentialsDto;

  constructor(private api: GithubApiService, @Inject(Tokens.credentials) githubCredentialsDto: GithubCredentialsDto) {
    super(api);
    this.organization = githubCredentialsDto.organization;
    this.username = githubCredentialsDto.username;
    this.credentials = githubCredentialsDto;
  }

  private createRequestToRepos() {
    let reposPath = '';

    if (this.organization) {
      reposPath = `repos/${this.organization}`;
    } else {
      reposPath = `repos/${this.username}`;
    }

    const request = this.api.createRequest(joinURL(`${this.request.defaults.baseURL}`, `${reposPath}`));

    return request;
  }

  public async create(repoBody: CreateRepoDto): Promise<Repo> {
    try {
      const reposPath = this.organization ? `orgs/${this.organization}/repos` : 'user/repos';

      const createRepoBody = {
        name: repoBody.name,
        private: repoBody.private,
        ...(repoBody.apiBody || {}),
      };

      const createdRepo = await this.request.post(reposPath, createRepoBody);

      const repository = Repo.fromGithub(createdRepo, this.api, this.credentials);

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
      const reposPath = this.organization ? `orgs/${this.organization}/repos` : `user/repos`;
      const repositories: any[] = [];

      let hasMore = true;
      let page = 1;

      do {
        const data: any = await this.request.get(reposPath, {
          params: {
            per_page: 100,
            page,
          },
        });

        page += 1;

        if (Array.isArray(data) && data.length === 0) {
          hasMore = false;
        } else if (Array.isArray(data)) {
          repositories.push(...data);
        } else {
          throw new BadRequestError(data);
        }
      } while (hasMore);

      return repositories.map((repository) => Repo.fromGithub(repository, this.api, this.credentials));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async getOne(repoName: string): Promise<Repo> {
    try {
      const request = this.createRequestToRepos();

      const repository: any = await request.get(repoName);

      return Repo.fromGithub(repository, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async update(repoName: string, repoBody: Record<string, any>): Promise<Repo> {
    try {
      const request = this.createRequestToRepos();

      const repository = await request.patch(repoName, repoBody);

      return Repo.fromGithub(repository, this.api, this.credentials);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async delete(repoName: string): Promise<void> {
    try {
      const request = this.createRequestToRepos();

      await request.delete(repoName);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
