import { Logger } from '@/core';
import { TooManyRequests } from '@/core/errors/too-many-requests.error';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { GitRepoService } from '@/modules/git/providers/repositories/services/git-repo.service';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { SalesforceService } from '@/modules/git/salesforce/services/salesforce.service';
import { sleep } from '@/modules/shared/utils';
import { Container, Service } from 'typedi';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { GitApiService } from '@/modules/git/providers/api/git-api.service';
import { SalesforceSyncService } from '@/modules/git/salesforce/services/salesforce-sync.service';

@Service({ transient: true })
export class DisableSyncService {
  private logger = new Logger(DisableSyncService.name);
  private repoService: GitRepoService;
  private sfLogger: SalesforceLogger3;
  private gitApiService: GitApiService<any>;
  private config: ConnectionDto;
  private prefix: string;

  constructor(private salesforceService: SalesforceService, private salesforceSync: SalesforceSyncService) {}

  async run(): Promise<void> {
    this.gitApiService = Container.get(Tokens.gitApiService) as GitApiService<any>;
    this.repoService = Container.get(Tokens.gitRepoService) as GitRepoService;

    this.config = Container.get(Tokens.config) as ConnectionDto;

    this.sfLogger = Container.get(Tokens.logger) as SalesforceLogger3;
    this.prefix = `[${DisableSyncService.name}] [${this.config.gitProvider.toUpperCase()}]`;

    this.salesforceService.setLoggerId(this.sfLogger.getLoggerId());

    try {
      await this.sfLogger.log(`${this.prefix} Start disable sync job for "${this.config.applicationUrl}".`).send();

      const repoList: Repo[] = await this.repoService.getAll();
      const flosumRepoNames: Set<string> = new Set(
        await this.salesforceSync.getAllRepositoryNames(Container.get(Tokens.connectionId) as string)
      );

      for (const repository of repoList) {
        if (!flosumRepoNames.has(repository.name)) {
          continue;
        }

        this.logger.log('Remove hooks from %s.', repository.name);

        const hooks = await repository.hooks.getAll();

        for (const hook of hooks) {
          if (hook.url.startsWith(this.config.applicationUrl)) {
            await repository.hooks.delete(hook.id);
            await this.sfLogger.log(`${this.prefix} Remove hook from '${repository.name}'.`).send();
          }
        }
      }
    } catch (error) {
      this.logger.error(error);

      if (error instanceof TooManyRequests) {
        await this.sfLogger
          .log(
            `${this.prefix} [PAUSE] Pause disable sync job due error - Rate limit quota for git service exceeded.
          Paused for 1h to refill limit quota continue. 
          This kind of error is not critical just need to wait until we can continue work with git service.`
          )
          .send();

        await sleep(60 * 60 * 1000); // wait for 1h to continue;

        this.run();
      } else {
        await this.sfLogger.error(`${this.prefix} Stop job due error - ${error}.`).send();
      }

      return;
    }

    await this.sfLogger.log(`${this.prefix} Job done.`).send();
  }
}
