import { Readable } from 'stream';
import { AxiosInstance } from 'axios';
import { QueryBuilder, BaseRetrieveData, DescribeObject } from '@flosum/salesforce';
import { SALESFORCE_API_VERSION } from '@/modules/data-masking/constants';

const FIELD_ID = 'Id';

export type BaseRetrieveOptions = {
  request: AxiosInstance;
  fields: string[];
  whereClause?: string;
  objectName: string;
  describe: DescribeObject;
};

export abstract class BaseRetrieve<T = unknown> extends Readable {
  protected readonly queryBuilder: QueryBuilder;
  protected readonly request: AxiosInstance;
  protected readonly fields: string[];
  protected readonly objectName: string;
  protected readonly whereClause?: string;
  protected readonly describe: DescribeObject;
  public retrieve: BaseRetrieveData<T>;

  protected get baseRetrievePayload() {
    return {
      queryBuilder: this.queryBuilder,
      instance: this.request,
      api: SALESFORCE_API_VERSION,
    };
  }

  protected constructor({ request, fields, whereClause, objectName, describe }: BaseRetrieveOptions) {
    super({ objectMode: true });

    this.queryBuilder = new QueryBuilder().select(FIELD_ID, ...fields).from(objectName);

    if (whereClause) {
      this.queryBuilder.where(`${whereClause}`);
    }

    this.request = request;
    this.fields = fields;
    this.whereClause = whereClause;
    this.objectName = objectName;
    this.describe = describe;
  }

  public async _read(): Promise<void> {
    try {
      await this.pull();
    } catch (error) {
      this.destroy(error);
    }
  }

  protected abstract pull(): Promise<void>;
}
