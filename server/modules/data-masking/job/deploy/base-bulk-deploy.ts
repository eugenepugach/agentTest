import { BaseDeploy } from '@data-masking-job/deploy/base-deploy';
import { CsvUtils } from '@flosum/utils';
import { DeployDataResult } from '@flosum/salesforce';

const BATCH_DEPLOY_PARALLEL_COUNT = process.env.DATA_MASKING_BATCH_DEPLOY_PARALLEL_COUNT ?? '';

export abstract class BaseBulkDeploy extends BaseDeploy {
  private static readonly CONCURRENT_DEPLOYMENT_COUNT = +BATCH_DEPLOY_PARALLEL_COUNT || 20;
  protected static readonly MAX_RECORDS_CHUNK_COUNT = 10000;
  protected static readonly MAX_CSV_RECORDS_CHUNK_SIZE = 10000000;
  protected recordsCsvSize = 0;
  private deployments: Promise<DeployDataResult[]>[] = [];
  private headerCsvSize: number;

  protected abstract deployRecords(records: Record<string, any>[]): Promise<DeployDataResult[]>;

  protected async finish(callback: (error?: Error | null) => void): Promise<void> {
    if (this.records.length) {
      await this.executeDeploy();
    }

    if (this.deployments.length) {
      const deployResults = (await Promise.all(this.deployments)).flat();
      this.deployments = [];
      await this.handleDeployResults(deployResults);
    }

    await this.deployer.close();

    callback();
  }

  protected async executeDeploy(): Promise<void> {
    const deployment = this.deployRecords(this.records);
    this.deployments.push(deployment);

    this.records = [];
    this.recordsCsvSize = 0;

    if (this.deployments.length >= BaseBulkDeploy.CONCURRENT_DEPLOYMENT_COUNT) {
      const deployResults = (await Promise.all(this.deployments)).flat();
      this.deployments = [];
      await this.handleDeployResults(deployResults);
    }
  }

  protected isExceedCSVSizeLimit(record: Record<string, any>): boolean {
    const recordCsvSize = CsvUtils.calculateRecordSize(record);

    if (!this.headerCsvSize) {
      this.headerCsvSize = CsvUtils.calculateHeaderSize(Object.keys(record));
    }

    return recordCsvSize + this.headerCsvSize + this.recordsCsvSize >= BaseBulkDeploy.MAX_CSV_RECORDS_CHUNK_SIZE;
  }
}
