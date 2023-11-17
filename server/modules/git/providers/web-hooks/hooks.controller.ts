import { Controller, Prefix, Post, param, Get, Patch, Delete } from '@/core';
import { AnyType } from '@/core/types/any.type';
import { InjectRepo } from '@/modules/git/providers/repositories/decorators/inject-repo.decorator';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { HookDto } from './dto/hook.dto';

@Controller()
@Prefix('')
export class HooksController {
  @Post()
  create(@InjectRepo('repoName') repo: Repo, @param.body() body: AnyType): Promise<HookDto> {
    return repo.hooks.create(body);
  }

  @Get()
  getAll(@InjectRepo('repoName') repo: Repo): Promise<HookDto[]> {
    return repo.hooks.getAll();
  }

  @Get(':hookName')
  getOne(@InjectRepo('repoName') repo: Repo, @param.path('hookName') hookName: string): Promise<HookDto> {
    return repo.hooks.getOne(hookName);
  }

  @Patch(':hookName')
  update(
    @InjectRepo('repoName') repo: Repo,
    @param.path('hookName') hookName: string,
    @param.body() body: AnyType
  ): Promise<HookDto> {
    return repo.hooks.update(hookName, body);
  }

  @Delete(':hookName')
  delete(@InjectRepo('repoName') repo: Repo, @param.path('hookName') hookName: string): Promise<void> {
    return repo.hooks.delete(hookName);
  }
}
