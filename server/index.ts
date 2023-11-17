import 'reflect-metadata';
import './common/env';
import Container from 'typedi';
import { Server } from '@/core/server';
import { ProxyController } from '@/modules/proxy/proxy.controller';
import { InfoController } from '@/modules/info/info.controller';
import { preBootstrap } from '@/pre-bootstrap';
import { SalesforceCredentialsService } from '@/modules/git/salesforce/services/salesforce.credentials-service';
import { GitController } from '@/modules/git/git.controller';
import { FunctionsController } from '@/modules/functions/functions.controller';
import { VeevaVaultController } from '@/modules/veeva-vault/veeva-vault.controller';
import { DataMaskingController } from '@/modules/data-masking/data-masking.controller';
import { RetentionPolicyService } from '@/modules/retention-policy/services/retention-policy.service';
import { DataMaskingRetentionPolicy } from '@/modules/retention-policy/classes/data-masking-retention-policy';
import { RetrieveMetadataController } from '@/modules/retrieve-metadata/retrieve-metadata.controller';
import { TrackingMetadataController } from '@/modules/tracking-metadata/tracking-metadata.controller';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function bootstrap() {
  const server = Container.get(Server);

  SalesforceCredentialsService.setCredentials();

  server.useControllers(
    ProxyController,
    InfoController,
    FunctionsController,
    GitController,
    VeevaVaultController,
    DataMaskingController,
    RetrieveMetadataController,
    TrackingMetadataController
  );

  await server.run(PORT);

  const retentionPolicyService = new RetentionPolicyService([new DataMaskingRetentionPolicy()]);

  retentionPolicyService.startScheduler();
}

preBootstrap().then(bootstrap);
