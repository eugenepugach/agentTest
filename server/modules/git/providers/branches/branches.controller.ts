import { Controller, Post, param, Get, Delete, Context, Version } from '@/core';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { BRANCH_NAME_REGEXP, FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE } from '@/constants';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { UnprocessableEntityError } from '@/core/errors/unprocessable-entity.error';
import { InjectRepo } from '@/modules/git/providers/repositories/decorators/inject-repo.decorator';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { SyncStatus } from '../../salesforce/enums/sync-status.enum';
import { SalesforceService } from '../../salesforce/services/salesforce.service';
import { BranchDto } from './dto/branch.dto';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
@Version('v1')
export class BranchesController {
  constructor(private salesforceService: SalesforceService) {}

  @Post()
  async create(
    @InjectRepo('repoName') repo: Repo,
    @param.body(new ValidationPipe({ transform: true })) body: CreateBranchDto,
    @param.context() ctx: Context
  ): Promise<BranchDto> {
    const { name } = body;
    const branchId = ctx.req.headers['x-branch-id'];

    if (!branchId) {
      throw new UnprocessableEntityError();
    }

    if (!BRANCH_NAME_REGEXP.test(name)) {
      await this.salesforceService.patchObject(`${FLOSUM_NAMESPACE}Repository__c`, branchId as string, {
        [`${FLOSUM_GIT_NAMESPACE}Synchronize_Status__c`]: SyncStatus.Error,
      });
      throw new BadRequestError(`Branch name do not match a naming rules.`);
    }
    return repo.branches.create(body);
  }

  @Get()
  getAll(@InjectRepo('repoName') repo: Repo): Promise<BranchDto[]> {
    return repo.branches.getAll();
  }

  @Get(':branchName')
  getOne(@InjectRepo('repoName') repo: Repo, @param.path('branchName') branchName: string): Promise<BranchDto> {
    return repo.branches.getOne(branchName);
  }

  @Delete(':branchName')
  delete(@InjectRepo('repoName') repo: Repo, @param.path('branchName') branchName: string): Promise<void> {
    return repo.branches.delete(branchName);
  }
}
