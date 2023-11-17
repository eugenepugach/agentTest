import { Controller, NestedController, Version } from '@/core';
import { ReposController } from '@/modules/git/providers/repositories/repos.controller';
import { CredentialsController } from '@/modules/git/providers/credentials/credentials.controller';
import { UseMiddlewares } from '@/core/decorators/use-middlewares.decorator';
import {
  ContainerMiddlewareAfter,
  ContainerMiddlewareBefore,
} from '@/modules/git/providers/middlewares/container.middleware';
import { DevopsController } from '@/modules/git/devops/devops.controller';

@Controller('git')
@Version('v1')
@UseMiddlewares(ContainerMiddlewareBefore, ContainerMiddlewareAfter)
export class GitController {
  @NestedController('repos/', ReposController)
  repos(): void {
    /* Handle repos path */
  }

  @NestedController('credentials/', CredentialsController)
  credentials(): void {
    /* Handle credentials path */
  }

  @NestedController('devops/', DevopsController)
  devops(): void {
    /* Handle devops path */
  }
}
