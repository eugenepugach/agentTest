import { Context, Controller, Delete, Get, NestedController, param, Patch, Post, Version } from '@/core';
import { AnyType } from '@/core/types/any.type';
import { FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE, REPOSITORY_NAME_REGEXP } from '@/constants';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { UnprocessableEntityError } from '@/core/errors/unprocessable-entity.error';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { BranchesController } from '../branches/branches.controller';
import { HooksController } from '@/modules/git/providers/web-hooks/hooks.controller';
import { SyncStatus } from '../../salesforce/enums/sync-status.enum';
import { SalesforceService } from '../../salesforce/services/salesforce.service';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { RepoService } from './decorators/repo-service.decorator';
import { CreateRepoDto } from './dto/create-repo.dto';
import { Repo } from './repo.class';
import { HooksUtils } from '@/modules/git/providers/web-hooks/hooks.utils';
import { GitRepoService } from './services/git-repo.service';
import { UseMiddlewares } from '@/core/decorators/use-middlewares.decorator';
import { GitConnectionMiddleware } from '@/modules/git/providers/middlewares/git-connection.middleware';
import { Tokens } from '@/modules/git/providers/providers.tokens';

@Controller('repos')
@Version('v1')
@UseMiddlewares(GitConnectionMiddleware)
export class ReposController {
  constructor(private salesforceService: SalesforceService) {}

  @Post()
  async create(
    @param.body(new ValidationPipe({ transform: true })) body: CreateRepoDto,
    @RepoService() repoService: GitRepoService,
    @param.context() ctx: Context
  ): Promise<Repo> {
    const { name } = body;
    const repositoryId = ctx.req.headers['x-repository-id'];
    const instanceUrl = ctx.req.headers['x-agent-url'] as string;
    const connectionId = ctx.req.headers['x-connection-id'] as string;

    if (!repositoryId) {
      throw new UnprocessableEntityError();
    }

    if (!REPOSITORY_NAME_REGEXP.test(name)) {
      await this.salesforceService.patchObject(`${FLOSUM_NAMESPACE}Repository__c`, repositoryId as string, {
        [`${FLOSUM_GIT_NAMESPACE}Synchronize_Status__c`]: SyncStatus.Error,
      });
      throw new BadRequestError(`Repostitory name do not match a naming rules.`);
    }

    let repository = await repoService.getOne(body.name).catch(() => null);

    if (!repository) {
      repository = await repoService.create(body);
    }

    if (body.createHook) {
      const hooks = await repository.hooks.getAll();

      let isHookExisted = false;

      for (const hook of hooks) {
        if (hook.url.startsWith(instanceUrl)) {
          isHookExisted = true;
          break;
        }
      }

      if (!isHookExisted) {
        await repository.hooks.create(
          HooksUtils.createHookPayload(
            ctx.container.get(Tokens.provider) as GitProvider,
            repository.hooks,
            instanceUrl,
            connectionId
          )
        );
      }
    }

    return repository;
  }

  @Get('')
  getAll(@RepoService() repoService: GitRepoService): Promise<Repo[]> {
    return repoService.getAll();
  }

  @Get(':repoName')
  getOne(@param.path('repoName') repoName: string, @RepoService() repoService: GitRepoService): Promise<Repo> {
    return repoService.getOne(repoName);
  }

  @Patch(':repoName')
  update(
    @param.path('repoName') repoName: string,
    @param.body() body: AnyType,
    @RepoService() repoService: GitRepoService
  ): Promise<Repo> {
    return repoService.update(repoName, body);
  }

  @Delete(':repoName')
  delete(@param.path('repoName') repoName: string, @RepoService() repoService: GitRepoService): Promise<void> {
    return repoService.delete(repoName);
  }

  @NestedController(':repoName/branches', BranchesController)
  branches(): void {
    /* Handle branches path */
  }

  @NestedController(':repoName/hooks', HooksController)
  hooks(): void {
    /* Handle hooks path */
  }
}
