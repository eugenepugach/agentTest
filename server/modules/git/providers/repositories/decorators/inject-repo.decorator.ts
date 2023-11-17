import { Context } from '@/core';
import { createCustomParamDecorator } from '@/core/utils/create-custom-param.util';
import { RepositoryFactory } from '@/modules/git/providers/repositories/repository.factory';

export const InjectRepo = (path: string): ParameterDecorator =>
  createCustomParamDecorator({
    value: async (ctx: Context) => {
      const repoName = ctx.req.params[path];

      if (!repoName) return null;

      const repoService = await RepositoryFactory.createFromContext(ctx.container);

      return repoService.getOne(repoName);
    },
  });
