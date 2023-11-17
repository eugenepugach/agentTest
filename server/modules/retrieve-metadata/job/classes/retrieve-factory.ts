import { BaseRetrieve, FullRetrieve, Logger, PartialRetrieve } from '@flosum/salesforce';
import { DeclarativeFilter } from '@/modules/retrieve-metadata/interfaces/retrieve-metadata.interfaces';
import { AxiosInstance } from 'axios';

export default class RetrieveFactory {
  public static create(
    instance: AxiosInstance,
    logger: Logger,
    declarativeFilter: DeclarativeFilter | null,
    metadataTypes: string[] | null,
    apiVersion: string
  ): BaseRetrieve {
    if (!declarativeFilter && !metadataTypes) {
      return new FullRetrieve(apiVersion, instance, logger, true);
    }

    return new PartialRetrieve(
      apiVersion,
      instance,
      logger,
      declarativeFilter?.filters || null,
      declarativeFilter?.logic || null,
      metadataTypes,
      true
    );
  }
}
