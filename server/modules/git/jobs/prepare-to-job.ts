import Container from 'typedi';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { ProvidersFactory } from '@/modules/git/devops/utils/connection';
import { RepositoryFactory } from '@/modules/git/providers/repositories/repository.factory';

export async function prepareToJob(connectionId: string): Promise<void> {
  Container.set(Tokens.connectionId, connectionId);

  const providersFactory = Container.get(ProvidersFactory);

  Container.set(Tokens.gitApiService, await providersFactory.createFromConnection(connectionId));
  Container.set(Tokens.gitRepoService, await RepositoryFactory.createFromContext(Container));
}
