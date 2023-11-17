import { Context, Controller, param, Post, Version } from '@/core';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { ERR_UNKNOWN_GIT_SERVICE } from '@/constants/errors';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { FlosumCommitDto } from './dto/flosum-commit.dto';
import { DevopsService } from './devops.service';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

@Controller('web-hooks')
@Version('v1')
export class DevopsController {
  constructor(private devopsService: DevopsService) {}

  @Post('flosum-commit')
  createCommit(
    @param.body(new ValidationPipe({ transform: true })) commitBody: FlosumCommitDto,
    @param.context() ctx: Context
  ): Promise<any> {
    ctx.statusCode = 204;

    const loggerId = ctx.req.headers['x-logger-id']?.toString() || '';
    const connectionId = ctx.req.headers['x-connection-id']?.toString() || null;

    if (!connectionId) {
      throw new BadRequestError(ERR_UNKNOWN_GIT_SERVICE);
    }

    return this.devopsService.createFlosumCommit(commitBody, loggerId, connectionId);
  }

  @Post('sync')
  sync(@param.context() ctx: Context): Promise<void> {
    ctx.statusCode = 204;

    const loggerId = ctx.req.headers['x-logger-id']?.toString() || '';
    const connectionId = ctx.req.headers['x-connection-id']?.toString() || null;

    if (!connectionId) {
      throw new BadRequestError(ERR_UNKNOWN_GIT_SERVICE);
    }

    return this.devopsService.createSync(loggerId, connectionId);
  }

  @Post('sync/disable')
  disableSync(@param.context() ctx: Context): Promise<void> {
    ctx.statusCode = 204;

    const loggerId = ctx.req.headers['x-logger-id']?.toString() || '';
    const connectionID = ctx.req.headers['x-connection-id']?.toString() || null;

    if (!connectionID) {
      throw new BadRequestError(ERR_UNKNOWN_GIT_SERVICE);
    }

    return this.devopsService.abortSync(loggerId, connectionID);
  }

  @Post('git-commit/:provider/:connectionId')
  gitSync(
    @param.context() ctx: Context,
    @param.path('provider') provider: GitProvider,
    @param.path('connectionId') connectionId: string
  ): Record<string, any> {
    this.devopsService.createGitCommit(ctx, provider, connectionId);

    return {};
  }
}
