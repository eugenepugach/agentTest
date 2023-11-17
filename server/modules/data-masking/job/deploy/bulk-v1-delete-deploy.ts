import { DeleteBulkv1DeployData, DeployDataResult } from '@flosum/salesforce';
import { BaseDeployOptions } from '@data-masking-job/deploy/base-deploy';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { BaseBulkDeploy } from '@data-masking-job/deploy/base-bulk-deploy';
import { CsvUtils } from '@flosum/utils';

export class BulkV1DeleteDeploy extends BaseBulkDeploy {
  constructor(options: BaseDeployOptions) {
    super(options);
    this.deployer = new DeleteBulkv1DeployData(this.baseDeployPayload);
  }

  protected async push(
    record: Record<string, any>,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    const isNeedDeploy =
      this.records.length >= BaseBulkDeploy.MAX_RECORDS_CHUNK_COUNT || this.isExceedCSVSizeLimit(record);

    if (isNeedDeploy) {
      await this.executeDeploy();
    }

    this.recordsCsvSize += CsvUtils.calculateRecordSize(record);
    this.records.push(record);

    callback();
  }

  protected deployRecords(records: Record<string, any>[]): Promise<DeployDataResult[]> {
    const csvRecords = csvStringify(records, {
      header: true,
    });

    return this.deployer.execute(csvRecords);
  }
}
