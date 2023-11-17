import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { AxiosInstance } from 'axios';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { NotFoundError } from '@/core/errors/not-found.error';
import { Git } from '../../../internal/git.internal';
import { BranchDto } from '../dto/branch.dto';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';

export abstract class GitBranchService {
  protected request: AxiosInstance;

  constructor(protected repository: Repo, private credentials: BaseCredentialsDto) {}

  protected abstract createRequest(): AxiosInstance;

  public async create(branchBody: CreateBranchDto): Promise<BranchDto> {
    try {
      await Git.createEmptyBranch(this.repository, branchBody.name, 'init branch', this.credentials);

      return this.getOne(branchBody.name);
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public async getOne(branchName: string): Promise<BranchDto> {
    try {
      const branches = await this.getAll();

      const branch = branches.find((branch) => branch.name === branchName);

      if (!branch) {
        throw new Error('Branch not found');
      }

      return branch;
    } catch (error) {
      throw new NotFoundError(error);
    }
  }

  public async getAll(): Promise<BranchDto[]> {
    try {
      const branches = await Git.getRepositoryBranches(this.repository, this.credentials);

      return branches;
    } catch (error) {
      throw new BadRequestError(error);
    }
  }

  public abstract delete(branchName: string): Promise<void>;
}
