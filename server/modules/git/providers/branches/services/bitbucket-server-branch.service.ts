import { BadRequestError } from '@/core/errors/bad-request.error';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { BitbucketServerApiService } from '@//modules/git/providers/api/bitbucket-server-api.service';
import { GitBranchService } from './git-branch.service';
import { BitbucketServerCredentialsDto } from '@/modules/git/providers/credentials/dto/bitbucket-server-credentials.dto';

export class BitbucketServerBranchService extends GitBranchService {
  constructor(repo: Repo, private api: BitbucketServerApiService, credentials: BitbucketServerCredentialsDto) {
    super(repo, credentials);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async delete(branchName: string): Promise<void> {
    try {
      await this.getOne(branchName);

      const url = this.repository.apiUrl.replace('/api/', '/branch-utils/');

      await this.request.delete(`${url}/branches`, {
        data: {
          name: `refs/heads/${branchName}`,
          dryRun: false,
        },
      });
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
