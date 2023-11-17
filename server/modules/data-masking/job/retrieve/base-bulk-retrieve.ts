import { BaseRetrieve } from '@data-masking-job/retrieve/base-retrieve';
import { pipeline, Readable } from 'stream';
import path from 'path';
import { CryptoUtils, FsUtils } from '@flosum/utils';
import { rm } from 'fs/promises';
import fs from 'fs';
import { pipeline as pipelinePromises } from 'stream/promises';
import { randomUUID } from 'crypto';
import { CastingContext, parse, Parser } from 'csv-parse';
import { FieldType, BulkV1QueryContentType } from '@flosum/salesforce';
import { jobStorePath, systemLogger } from '@data-masking-job/job-detail';
import { SALESFORCE_API_VERSION } from '@/modules/data-masking/constants';

export abstract class BaseBulkRetrieve extends BaseRetrieve<Readable | null> {
  protected static POLL_INTERVAL = 5000;
  private _fieldsTypes: Map<string, FieldType>;
  private csvParser: Parser;

  protected get baseRetrievePayload() {
    return {
      queryBuilder: this.queryBuilder,
      instance: this.request,
      api: SALESFORCE_API_VERSION,
      contentType: BulkV1QueryContentType.TEXT_CSV,
    };
  }

  public async pull(): Promise<void> {
    if (this.retrieve.getIsDone() && !this.csvParser?.isPaused()) {
      this.push(null);
      return;
    }

    if (this.csvParser?.isPaused()) {
      this.csvParser.resume();
      return;
    }

    const retrieveResult = await this.retrieve.execute();

    if (!retrieveResult) {
      return this.pull();
    }

    await this.createReader(retrieveResult);
  }

  protected async createReader(retrieveResult: Readable): Promise<void> {
    const filePath = path.join(jobStorePath, randomUUID());
    const encryptionKey = randomUUID();

    const readStream = await this.writeEncryptedTempFile(retrieveResult, filePath, encryptionKey).then(() =>
      this.readEncryptedTempFile(filePath, encryptionKey)
    );

    const parseOptions = {
      columns: true,
      cast: this.castCsvValue.bind(this),
    };

    this.csvParser = pipeline(readStream, parse(parseOptions), this.pipelineCallback.bind(this, filePath));

    this.csvParser.on('data', (data) => {
      this.csvParser.pause();
      this.push(data);
    });

    this.csvParser.on('end', async () => {
      if (await FsUtils.isExistsPath(filePath)) {
        await rm(filePath).catch(this.handleError.bind(this, null));
      }

      return this._read();
    });

    this.csvParser.on('error', this.pipelineCallback.bind(this, filePath));
  }

  protected async writeEncryptedTempFile(stream: Readable, filePath: string, encryptionKey: string): Promise<void> {
    const writeStream = fs.createWriteStream(filePath);
    await pipelinePromises(stream, CryptoUtils.createEncryptPipe(encryptionKey), writeStream);
  }

  protected async readEncryptedTempFile(filePath: string, encryptionKey: string): Promise<Readable> {
    const readStream = fs.createReadStream(filePath);
    const vector = await this.readEncryptionVector(readStream);
    const decryptPipe = CryptoUtils.createDecryptPipe(encryptionKey, vector);

    return pipeline(readStream, decryptPipe, this.pipelineCallback.bind(this, filePath));
  }

  private async pipelineCallback(filePath: string | null, error?: NodeJS.ErrnoException | null): Promise<void> {
    if (error) {
      await this.handleError(filePath, error);
    }
  }

  private async handleError(filePath: string | null, error: NodeJS.ErrnoException): Promise<void> {
    if (filePath && (await FsUtils.isExistsPath(filePath))) {
      await rm(filePath).catch((error) => systemLogger.error(error));
    }

    this.destroy(error);
  }

  private async readEncryptionVector(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      stream.once('error', reject);
      stream.once('readable', () => {
        const vector = stream.read(16);
        resolve(vector);
      });
    });
  }

  private castCsvValue(value: string, { header, column }: CastingContext): any {
    if (!this._fieldsTypes) {
      this._fieldsTypes = this.describe.fields.reduce(
        (acc, { name, type }) => acc.set(name, type),
        new Map<string, FieldType>()
      );
    }

    if (header) return value;
    if (!value) return null;

    switch (this._fieldsTypes.get(<string>column)) {
      case FieldType.DATETIME:
        return value.replace(/\.\d{3}Z$/, '.000+0000');
      case FieldType.BOOLEAN:
        return value === 'true';
      case FieldType.CURRENCY:
      case FieldType.DOUBLE:
      case FieldType.INT:
      case FieldType.PERCENT:
        return +value;
      default:
        return value;
    }
  }
}
