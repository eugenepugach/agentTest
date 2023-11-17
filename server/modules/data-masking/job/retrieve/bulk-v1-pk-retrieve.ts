import { BaseRetrieveOptions } from '@data-masking-job/retrieve/base-retrieve';
import { BaseBulkRetrieve } from '@data-masking-job/retrieve/base-bulk-retrieve';
import { Bulk1PkRetrieveData } from '@flosum/salesforce';

export class BulkV1PkRetrieve extends BaseBulkRetrieve {
  public constructor(baseOptions: BaseRetrieveOptions) {
    super(baseOptions);

    this.retrieve = new Bulk1PkRetrieveData({
      ...this.baseRetrievePayload,
      pollInterval: BaseBulkRetrieve.POLL_INTERVAL,
      objectName: this.objectName,
    });
  }
}
