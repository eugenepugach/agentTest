import {
  DeclarativeFilterLine,
  DeclarativeFilterOptions,
  PartialRetrieve,
  SoapRetrieveMetadataResult,
  MetadataComponent,
} from '@flosum/salesforce';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';
import { Transform, TransformCallback } from 'stream';
import {
  SourceMemberData,
  MetadataRetrieverRecord,
  BaseOptions,
} from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';
import { LoggerAdapter } from '@/modules/tracking-metadata/job/classes/logger/logger.adapter';

export interface MetadataHandlerOptions extends BaseOptions {
  metadataTypes: string[];
  logger: Logger;
}

export class MetadataRetriever extends Transform {
  private readonly api: MetadataHandlerOptions['apiVersion'];
  private readonly instance: MetadataHandlerOptions['instance'];
  private readonly logger: MetadataHandlerOptions['logger'];
  private readonly metadataTypes: MetadataHandlerOptions['metadataTypes'];

  private sourceMemberRecords: SourceMemberData[] = [];
  private metadataResult: SoapRetrieveMetadataResult;

  constructor({ apiVersion, instance, metadataTypes, logger }: MetadataHandlerOptions) {
    super({ objectMode: true });

    this.api = apiVersion;
    this.logger = logger;
    this.instance = instance;
    this.metadataTypes = metadataTypes;
  }

  private createDeclarativeFilter(): DeclarativeFilterLine[] {
    const metadataIds = this.sourceMemberRecords.map((record) => record.metadataId).join(';');

    const declarativeFilter: DeclarativeFilterLine[] = [];
    declarativeFilter.push({
      field: 'id',
      option: DeclarativeFilterOptions.IN,
      value: metadataIds,
    });

    return declarativeFilter;
  }

  private async retrieveMetadata(): Promise<void> {
    const declarativeFilter = this.createDeclarativeFilter();
    const logger = new LoggerAdapter(this.logger);

    this.metadataResult = await new PartialRetrieve(
      this.api,
      this.instance,
      logger,
      declarativeFilter,
      null,
      this.metadataTypes
    ).execute();
  }

  private async handle(): Promise<void> {
    await this.retrieveMetadata();

    for (const item of this.sourceMemberRecords) {
      const metadataItem = this.metadataResult.items[item.metadataType];

      const metadataComponent = metadataItem.components.find(
        (component: MetadataComponent) => component.listMetadataItem.id === item.metadataId
      );

      if (!metadataComponent) {
        continue;
      }

      const chunk: MetadataRetrieverRecord = {
        sourceMemberRecord: item,
        listMetadataItem: metadataComponent.listMetadataItem,
        files: metadataComponent.files,
      };

      this.push(chunk);
    }
  }

  public async _transform(record: SourceMemberData, _: BufferEncoding, callback: TransformCallback): Promise<void> {
    try {
      this.sourceMemberRecords.push(record);

      callback();
    } catch (error) {
      callback(error);
    }
  }

  public async _flush(callback: TransformCallback): Promise<void> {
    try {
      if (this.sourceMemberRecords.length) {
        await this.handle();
      }

      this.logger.log(`Retrieved metadata items completed`);
      await this.logger.update();

      callback();
    } catch (error) {
      callback(error);
    }
  }
}
