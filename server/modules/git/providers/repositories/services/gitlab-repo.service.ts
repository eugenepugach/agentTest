import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { GitlabApiService } from '@/modules/git/providers/api/gitlab-api.service';
import { Inject, Service } from 'typedi';
import { ApiError } from '@/core/errors/api.error';
import { Git } from '../../../internal/git.internal';
import { CreateRepoDto } from '../dto/create-repo.dto';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { GitRepoService } from './git-repo.service';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Service()
export class GitlabRepoService extends GitRepoService {
  private readonly groupId: string;
  private username: string;
  private groupPath: string;
  private readonly credentials: GitlabCredentialsDto;

  constructor(private api: GitlabApiService, @Inject(Tokens.credentials) gitlabCredentialsDto: GitlabCredentialsDto) {
    super(api);
    this.groupId = gitlabCredentialsDto.groupId;
    this.credentials = gitlabCredentialsDto;
  }

  private async getGroupPath(): Promise<string> {
    if (!this.groupPath) {
      const group = await this.api.getGroup(this.groupId);
      this.groupPath = group.full_path;
    }

    return this.groupPath;
  }

  private async getUsername(): Promise<string> {
    if (!this.username) {
      const user = await this.api.getCurrentUser();
      this.username = user.username;
    }

    return this.username;
  }

  private async createRequestToRepo(repoName: string) {
    const path = await (this.groupId ? this.getGroupPath() : this.getUsername());

    const request = this.api.createRequest(
      `${this.request.defaults.baseURL}/projects/${encodeURIComponent(`${path}/${repoName}`)}`
    );

    return request;
  }

  public async create(repoBody: CreateRepoDto): Promise<Repo> {
    try {
      const createRepoBody = {
        name: repoBody.name,
        visibility: repoBody.private ? 'private' : 'public',
        namespace_id: this.groupId,
        ...(repoBody.apiBody || {}),
      };

      const repository = await this.request.post('projects', createRepoBody);

      const repo = Repo.fromGitlab(repository, this.api, this.credentials);

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
      const request = await this.createRequestToRepo(repoName);

      const repository: any = await request.get('');

      return Repo.fromGitlab(repository, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<Repo[]> {
    try {
      let pathToRepos = '';

      if (this.groupId) {
        pathToRepos = `groups/${this.groupId}/projects`;
      } else {
        const username = await this.getUsername();

        pathToRepos = `users/${username}/projects`;
      }

      let hasMore = true;
      let page = 1;

      const repositories: any[] = [];

      do {
        const data: any[] = await this.request.get(pathToRepos, {
          params: {
            page,
            per_page: 100,
          },
        });

        repositories.push(...data);

        hasMore = data.length > 0;
        page += 1;
      } while (hasMore);

      return repositories.map((repository) => Repo.fromGitlab(repository, this.api, this.credentials));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async update(repoName: string, repoBody: Record<string, any>): Promise<Repo> {
    try {
      const request = await this.createRequestToRepo(repoName);

      const repository: any = await request.put('', { ...repoBody, path: repoBody.name });

      return Repo.fromGitlab(repository, this.api, this.credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new NotFoundError(error);
    }
  }

  public async delete(repoName: string): Promise<void> {
    try {
      const request = await this.createRequestToRepo(repoName);
      await request.delete('');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new BadRequestError(error);
    }
  }
}
