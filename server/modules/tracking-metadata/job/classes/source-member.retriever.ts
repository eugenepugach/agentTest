import { CompositeRetrieveData, QueryBuilder } from '@flosum/salesforce';
import { Readable } from 'stream';
import { BaseOptions } from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';

const SOURCE_MEMBER_OBJECT_NAME = 'SourceMember';
const LAST_MODIFIED_DATE_FIELD_NAME = 'LastModifiedDate';
const MEMBER_TYPE_FIELD_NAME = 'MemberType';
const SOURCE_MEMBER_SELECT_FIELDS = [
  'Id',
  'MemberIdOrName',
  'ChangedBy',
  'IsNameObsolete',
  'IsNewMember',
  'MemberName',
  'MemberType',
  'RevisionCounter',
  'LastModifiedDate',
];

export interface SourceMemberRetrieverOptions extends BaseOptions {
  lastRetrieveDate: string;
  currentRetrieveDate: number;
  metadataTypes: string[];
}

export class SourceMemberRetriever extends Readable {
  private readonly api: SourceMemberRetrieverOptions['apiVersion'];
  private readonly instance: SourceMemberRetrieverOptions['instance'];
  private readonly lastRetrieveDate: SourceMemberRetrieverOptions['lastRetrieveDate'];
  private readonly currentRetrieveDate: SourceMemberRetrieverOptions['currentRetrieveDate'];
  private readonly metadataTypes: SourceMemberRetrieverOptions['metadataTypes'];

  private dataSource: AsyncIterator<Record<string, any>>;

  public constructor({
    apiVersion,
    instance,
    lastRetrieveDate,
    currentRetrieveDate,
    metadataTypes,
  }: SourceMemberRetrieverOptions) {
    super({ objectMode: true });

    this.instance = instance;
    this.api = apiVersion;
    this.lastRetrieveDate = lastRetrieveDate;
    this.currentRetrieveDate = currentRetrieveDate;
    this.metadataTypes = metadataTypes;

    this.dataSource = this.createDataSource();
  }

  private async *createDataSource(): AsyncIterator<Record<string, any>> {
    const retriever = new CompositeRetrieveData({
      api: this.api,
      queryBuilder: this.buildSourceMemberQuery(),
      instance: this.instance,
      isTooling: true,
    });

    do {
      const { records } = await retriever.execute();
      yield* records;
    } while (!retriever.getIsDone());
    return null;
  }

  private buildSourceMemberQuery(): QueryBuilder {
    return new QueryBuilder()
      .select(...SOURCE_MEMBER_SELECT_FIELDS)
      .from(SOURCE_MEMBER_OBJECT_NAME)
      .where(`${MEMBER_TYPE_FIELD_NAME} IN (:metadataTypes)`, { metadataTypes: this.metadataTypes })
      .andWhere(`${LAST_MODIFIED_DATE_FIELD_NAME} >= :lastRetrieveDate`, {
        lastRetrieveDate: new Date(this.lastRetrieveDate),
      })
      .andWhere(`${LAST_MODIFIED_DATE_FIELD_NAME} < :currentRetrieveDate`, {
        currentRetrieveDate: new Date(this.currentRetrieveDate),
      });
  }

  public async _read(): Promise<void> {
    try {
      const { value } = await this.dataSource.next();
      this.push(value);
    } catch (error) {
      this.destroy(error);
    }
  }
}
