import { BaseRetrieveOptions } from '@data-masking-job/retrieve/base-retrieve';
import { Bulk1RetrieveData } from '@flosum/salesforce';
import { BaseBulkRetrieve } from '@data-masking-job/retrieve/base-bulk-retrieve';

export class BulkV1Retrieve extends BaseBulkRetrieve {
  public constructor(baseOptions: BaseRetrieveOptions) {
    super(baseOptions);

    this.retrieve = new Bulk1RetrieveData({
      ...this.baseRetrievePayload,
      pollInterval: BaseBulkRetrieve.POLL_INTERVAL,
      objectName: this.objectName,
    });
  }
}
