import { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { updateVeevaConnection } from '@/modules/veeva-vault/utils/veeva-auth.utils';
import { VeevaError } from '@/modules/veeva-vault/classes/errors/veeva-error';
import { VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';

export type VpkServiceOptions = {
  connection: AxiosInstance;
};

export class VpkService {
  private readonly _connection: VpkServiceOptions['connection'];

  constructor({ connection }: VpkServiceOptions) {
    this._connection = connection;
  }

  public async generate(zipPath: string, retries = 1): Promise<Buffer> {
    const form = new FormData();
    form.append('file', createReadStream(zipPath));

    const response = await this._connection.post(VeevaConstants.ENDPOINT_EXPORT_IMPORT_PACKAGE, form, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const isJSON = response.headers['content-type']?.includes('application/json');

    if (!isJSON) {
      return response.data;
    } else {
      const responseObject = JSON.parse(response.data);

      if (retries > 0) {
        await updateVeevaConnection(this._connection);
        return await this.generate(zipPath, retries - 1);
      }

      throw new VeevaError(responseObject.errors);
    }
  }

  public async validate(vpkPath: string, retries = 1): Promise<Record<string, any>> {
    const form = new FormData();
    form.append('file', createReadStream(vpkPath));

    const response = await this._connection.post(VeevaConstants.ENDPOINT_VALIDATE_VPK, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const responseObject = response.data;
    if (responseObject.responseStatus === VeevaResponseStatus.SUCCESS) {
      return responseObject;
    } else {
      if (retries > 0) {
        await updateVeevaConnection(this._connection);
        return await this.validate(vpkPath, retries - 1);
      }

      throw new VeevaError(responseObject.errors);
    }
  }
}
