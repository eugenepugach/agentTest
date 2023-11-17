import { RestRetrieve, RestRetrieveOptions } from '@data-masking-job/retrieve/rest-retrieve';
import { BaseRetrieveOptions } from '@data-masking-job/retrieve/base-retrieve';
import { Readable } from 'stream';
import { BulkV1Retrieve } from '@data-masking-job/retrieve/bulk-v1-retrieve';
import { BulkV1PkRetrieve } from '@data-masking-job/retrieve/bulk-v1-pk-retrieve';

export type RetrieveOptions = BaseRetrieveOptions & RestRetrieveOptions;

export class RetrieveFactory {
  private static readonly LIMIT_COUNT_REST = 1000000;
  private static readonly LIMIT_COUNT_BULK = 10000000;

  public static create(retrieveOptions: RetrieveOptions, recordsCount: number): Readable {
    if (recordsCount >= this.LIMIT_COUNT_BULK || recordsCount === -1) {
      return new BulkV1PkRetrieve(retrieveOptions);
    }

    if (recordsCount >= this.LIMIT_COUNT_REST) {
      return new BulkV1Retrieve(retrieveOptions);
    }

    return new RestRetrieve(retrieveOptions);
  }
}
