import { readFileSync } from 'fs';
import 'reflect-metadata';
import Container from 'typedi';
import '@/common/env';
import { DisableSyncService } from '@/modules/git/devops/services/disable-sync.service';
import { getSocketPath } from './childs.utils';
import { SalesforceCredentialsService } from '@/modules/git/salesforce/services/salesforce.credentials-service';
import { Tokens } from '@/modules/git/providers/providers.tokens';
import { SalesforceLogger3 } from '@/modules/git/salesforce/services/salesforce-logger-v3.service';
import { prepareToJob } from '@/modules/git/jobs/prepare-to-job';

const socketPath = getSocketPath();

if (!socketPath) {
  throw new Error('Unresolved socket path');
}

const message = readFileSync(socketPath, { encoding: 'utf-8' });
const { data } = JSON.parse(message);

const execute = async (data: any) => {
  SalesforceCredentialsService.setCredentials();

  Container.set(Tokens.logger, new SalesforceLogger3(data.loggerId));

  await prepareToJob(data.connectionId);

  const service = Container.get(DisableSyncService);
  await service.run();
};

execute(data)
  .then(() => process.exit(0))
  .catch(() => process.exit(0));
