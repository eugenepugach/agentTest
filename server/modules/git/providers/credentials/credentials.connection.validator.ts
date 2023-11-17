import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { CredentialsFactory } from '@/modules/git/providers/credentials/credentials.factory';
import { ServicesFactory } from '@/modules/git/providers/api/git-api.factory';
import { Context } from '@/core';

export class ConnectionValidator {
  static async validate(connection: ConnectionDto, { container }: Context): Promise<boolean> {
    const credentials = await CredentialsFactory.createFromConnection(connection);

    container.set(Tokens.provider, connection.gitProvider);
    container.set(Tokens.credentials, credentials);

    return ServicesFactory.createFromProvider(container, connection.gitProvider)
      .isLoggedIn()
      .catch(() => false);
  }
}
