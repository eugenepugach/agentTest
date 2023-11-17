import { NotFoundError } from '@/core/errors/not-found.error';
import { BitbucketApiService } from '@/modules/git/providers/api/bitbucket-api.service';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { GitBranchService } from './git-branch.service';
import { BitbucketCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-credentials.dto';

export class BitbucketBranchService extends GitBranchService {
  constructor(repo: Repo, private api: BitbucketApiService, credentials: BitbucketCredentialsDto) {
    super(repo, credentials);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async delete(branchName: string): Promise<void> {
    try {
      await this.request.delete(`refs/branches/${branchName}`);
    } catch (error) {
      throw new NotFoundError(error);
    }
  }
}
