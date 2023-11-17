import { createCustomParamDecorator } from '@/core/utils/create-custom-param.util';
import { Context } from '@/core';
import { RepositoryFactory } from '@/modules/git/providers/repositories/repository.factory';

export const RepoService = (): ParameterDecorator =>
  createCustomParamDecorator({
    value: async (ctx: Context) => {
      return await RepositoryFactory.createFromContext(ctx.container);
    },
  });
