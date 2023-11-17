import { chunkArray, sleep } from '@/modules/shared/utils';
import { AxiosInstance } from 'axios';
import { VeevaJobStatus, VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import { VeevaError } from '@/modules/veeva-vault/classes/errors/veeva-error';
import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';

export type VeevaServiceOptions = {
  connection: AxiosInstance;
  logger: BaseLogger;
};

export class VeevaService {
  private static readonly JOB_STATUS_TIMEOUT = 10000;
  private static readonly CREATE_RECORDS_LIMIT = 500;
  private static readonly DELETE_RECORDS_LIMIT = 500;

  private readonly _connection: VeevaServiceOptions['connection'];
  private readonly _logger: VeevaServiceOptions['logger'];

  constructor({ connection, logger }: VeevaServiceOptions) {
    this._connection = connection;
    this._logger = logger;
  }

  public async executeManyVQL(endpointList: string[]): Promise<Record<string, any>[]> {
    const promiseVQLArray: Promise<Record<string, any>[]>[] = [];
    for (const endpoint of endpointList) {
      promiseVQLArray.push(this.executeVQL(endpoint));
    }
    const result = await Promise.all(promiseVQLArray);
    return result.flat();
  }

  public async executeVQL(endpoint: string): Promise<Record<string, any>[]> {
    const records: Record<string, any>[] = [];
    do {
      const response = await this._connection.get(endpoint);
      const responseObject: Record<string, any> = response.data;
      if (responseObject.responseStatus === VeevaResponseStatus.SUCCESS) {
        const {
          responseDetails: { next_page },
          data,
        } = responseObject;
        endpoint = next_page || null;

        records.push(...data);
      } else {
        throw new VeevaError(responseObject.errors);
      }
    } while (endpoint);

    return records;
  }

  public async createVeevaObjectRecords(endpoint: string, records: Record<string, any>[]): Promise<string[]> {
    const recordIdList: string[] = [];
    const bodyChunkList = chunkArray<Record<string, any>>(records, VeevaService.CREATE_RECORDS_LIMIT);
    const allLength = records.length;
    let currentLength = 0;
    for (const bodyChunk of bodyChunkList) {
      currentLength += bodyChunk.length;
      this._logger.log(`Creating ${currentLength}/${allLength} records.`);
      const response = await this._connection.post(endpoint, bodyChunk);
      const responseObject = response.data;

      if (responseObject.responseStatus === VeevaResponseStatus.SUCCESS) {
        for (const { responseStatus, data } of responseObject.data) {
          if (responseStatus === VeevaResponseStatus.SUCCESS) {
            recordIdList.push(data.id);
          } else {
            throw new VeevaError(responseObject.errors);
          }
        }
      } else {
        throw new VeevaError(responseObject.errors);
      }
    }

    return recordIdList;
  }

  public async deleteVeevaObjectRecords(endpoint: string, idList: string[]): Promise<void> {
    const body = idList.map((id) => ({ id }));
    const bodyChunkList = chunkArray<{ id: string }>(body, VeevaService.DELETE_RECORDS_LIMIT);
    let currentLength = 0;
    for (const bodyChunk of bodyChunkList) {
      currentLength += bodyChunk.length;
      this._logger.log(`Deleting ${currentLength}/${idList.length} records`);
      const { data: response } = await this._connection.delete(endpoint, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: bodyChunk,
      });

      if (response.responseStatus === VeevaResponseStatus.SUCCESS) {
        for (const record of response.data) {
          const { responseStatus, errors } = record;
          if (responseStatus !== VeevaResponseStatus.SUCCESS) {
            throw new VeevaError(errors);
          }
        }
      } else {
        throw new VeevaError(response.errors);
      }
    }
  }

  public async getJobResult(endpointList: string[]): Promise<Record<string, any>[]> {
    const jobResultList: Record<string, any>[] = [];

    do {
      this._logger.log('Check Retrieval Status: Not Completed. Next check after 10 seconds.');
      await sleep(VeevaService.JOB_STATUS_TIMEOUT);
      const newEndpointList: string[] = [];
      for (const endpoint of endpointList) {
        const { data: response } = await this._connection.get(endpoint);

        if (response.responseStatus === VeevaResponseStatus.SUCCESS) {
          const { data } = response;
          switch (data.status) {
            case VeevaJobStatus.SUCCESS:
            case VeevaJobStatus.ERRORS_ENCOUNTERED:
              jobResultList.push(data);
              break;
            case VeevaJobStatus.QUEUEING:
            case VeevaJobStatus.CANCELLED:
            case VeevaJobStatus.MISSED_SCHEDULE:
              throw new Error(`Cannot retrieve job. Job status: ${data.status}`);
            case VeevaJobStatus.QUEUED:
            case VeevaJobStatus.RUNNING:
            case VeevaJobStatus.SCHEDULED:
              newEndpointList.push(endpoint);
              break;
            default:
              throw new Error(`Unknown Job status : '${data.status}'`);
          }
        } else {
          throw new VeevaError(response.errors);
        }
      }
      endpointList = newEndpointList;
    } while (endpointList.length);

    return jobResultList;
  }
}
