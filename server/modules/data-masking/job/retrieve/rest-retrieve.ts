import { BaseRetrieve, BaseRetrieveOptions } from '@data-masking-job/retrieve/base-retrieve';
import { CompositeRetrieveData, RetrieveResult } from '@flosum/salesforce';

export type RestRetrieveOptions = BaseRetrieveOptions;

export class RestRetrieve extends BaseRetrieve<RetrieveResult> {
  private static readonly MAX_RETRIEVE_RECORDS = 2000;

  constructor(baseOptions: RestRetrieveOptions) {
    super(baseOptions);

    this.retrieve = new CompositeRetrieveData({
      ...this.baseRetrievePayload,
      maxRecords: RestRetrieve.MAX_RETRIEVE_RECORDS,
    });
  }

  private _records: Record<string, any>[] = [];

  public async pull(): Promise<void> {
    if (this.retrieve.getIsDone() && !this._records.length) {
      this.push(null);
      return;
    }

    if (!this._records.length) {
      const { records } = await this.retrieve.execute();

      if (!records.length) {
        return this.pull();
      }

      this._records = records;
    }
    const record = this._records.shift();
    this.push(record);
  }
}
