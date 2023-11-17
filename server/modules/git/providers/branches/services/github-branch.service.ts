import { BadRequestError } from '@/core/errors/bad-request.error';
import { GithubApiService } from '@/modules/git/providers/api/github-api.service';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { GitBranchService } from './git-branch.service';
import { GithubCredentialsDto } from '@/modules/git/providers/credentials/dto/github-credentials.dto';

export class GithubBranchService extends GitBranchService {
  constructor(repo: Repo, private api: GithubApiService, credentials: GithubCredentialsDto) {
    super(repo, credentials);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async delete(branchName: string): Promise<void> {
    try {
      await this.request.delete(`git/refs/heads/${branchName}`);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
