import { BadRequestError } from '@/core/errors/bad-request.error';
import { GitlabApiService } from '@/modules/git/providers/api/gitlab-api.service';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { GitBranchService } from './git-branch.service';
import { GitlabCredentialsDto } from '@/modules/git/providers/credentials/dto/gitlab-credentials.dto';

export class GitlabBranchService extends GitBranchService {
  constructor(repo: Repo, private api: GitlabApiService, credentials: GitlabCredentialsDto) {
    super(repo, credentials);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async delete(branchName: string): Promise<void> {
    try {
      await this.request.delete(`repository/branches/${branchName}`);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
