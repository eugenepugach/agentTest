import { SimpleBulkv1DeployData, DeployDataResult } from '@flosum/salesforce';
import { BaseDeployOptions } from '@data-masking-job/deploy/base-deploy';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { BaseBulkDeploy } from '@data-masking-job/deploy/base-bulk-deploy';
import { CsvUtils } from '@flosum/utils';

export class BulkV1Deploy extends BaseBulkDeploy {
  private static readonly NULL_CSV_VALUE = '#N/A';

  constructor(options: BaseDeployOptions) {
    super(options);
    this.deployer = new SimpleBulkv1DeployData(this.baseDeployPayload);
  }

  protected async push(
    record: Record<string, any>,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    const preparedRecord = this.castRecord(record);

    const isNeedDeploy =
      this.records.length >= BaseBulkDeploy.MAX_RECORDS_CHUNK_COUNT || this.isExceedCSVSizeLimit(preparedRecord);

    if (isNeedDeploy) {
      await this.executeDeploy();
    }

    this.recordsCsvSize += CsvUtils.calculateRecordSize(record);
    this.records.push(preparedRecord);

    callback();
  }

  protected deployRecords(records: Record<string, any>[]): Promise<DeployDataResult[]> {
    const csvRecords = csvStringify(records, {
      header: true,
    });

    return this.deployer.execute(csvRecords);
  }

  private castRecord(record: Record<string, any>): Record<string, any> {
    const castedRecord: Record<string, any> = {};

    for (const key in record) {
      if (record[key] === null) {
        castedRecord[key] = BulkV1Deploy.NULL_CSV_VALUE;
      } else {
        castedRecord[key] = record[key];
      }
    }

    return castedRecord;
  }
}
