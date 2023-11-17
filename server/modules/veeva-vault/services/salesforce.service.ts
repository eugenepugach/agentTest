import { AxiosInstance } from 'axios';
import { chunkArray } from '@/modules/shared/utils';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';

export type SalesforceServiceOptions = {
  connection: AxiosInstance;
};

export class SalesforceService {
  private static readonly INSERT_RECORDS_LIMIT = 200;

  private readonly _connection: SalesforceServiceOptions['connection'];

  constructor({ connection }: SalesforceServiceOptions) {
    this._connection = connection;
  }

  public async insertMultipleRecords(
    objectName: string,
    records: Record<string, any>[]
  ): Promise<Record<string, any>[]> {
    const result: Record<string, any>[] = [];

    const recordsWithAttribute = records.map((oneRecord) => ({
      attributes: { type: objectName },
      ...oneRecord,
    }));

    const chunkRecords = chunkArray<Record<string, any>>(recordsWithAttribute, SalesforceService.INSERT_RECORDS_LIMIT);

    for (const chunk of chunkRecords) {
      const { data } = await this._connection.post(FlosumConstants.ENDPOINT_INSERT_MULTIPLE_RECORDS, {
        allOrNone: true,
        records: chunk,
      });

      result.push(...data);
    }

    return result;
  }

  public async retrieveRecords(query: string): Promise<Record<string, any>[]> {
    const records: Record<string, any>[] = [];

    let nextRecordsUrl: string | undefined;
    let isDone: boolean;
    do {
      let response;
      if (!nextRecordsUrl) {
        response = await this._connection.get(FlosumConstants.ENDPOINT_QUERY, {
          params: {
            q: query,
          },
        });
      } else {
        response = await this._connection.get(nextRecordsUrl);
      }
      records.push(...response.data.records);

      nextRecordsUrl = response.data.nextRecordsUrl;
      isDone = response.data.done;
    } while (!isDone);

    return records;
  }
}
