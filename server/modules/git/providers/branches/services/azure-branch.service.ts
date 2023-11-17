import { BadRequestError } from '@/core/errors/bad-request.error';
import { AzureApiService } from '@/modules/git/providers/api/azure-api.service';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { GitBranchService } from './git-branch.service';
import { AzureCredentialsDto } from '@/modules/git/providers/credentials/dto/azure-credentials.dto';

export class AzureBranchService extends GitBranchService {
  constructor(repo: Repo, private api: AzureApiService, credentials: AzureCredentialsDto) {
    super(repo, credentials);

    this.request = this.createRequest();
  }

  protected createRequest(): AxiosInstance {
    return this.api.createRequest(this.repository.apiUrl);
  }

  public async delete(branchName: string): Promise<void> {
    try {
      await this.getOne(branchName);

      await this.request.post('refs', [
        {
          name: `refs/heads/${branchName}`,
          newObjectId: '0000000000000000000000000000000000000000',
          oldObjectId: '0000000000000000000000000000000000000000',
        },
      ]);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }
}
