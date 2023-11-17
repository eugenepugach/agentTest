import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { AxiosInstance } from 'axios';
import { VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';

export async function updateVeevaConnection(connection: AxiosInstance): Promise<void> {
  const { data } = await connection.get(VeevaConstants.ENDPOINT_AUTH_CHECK_SESSION);
  if (data.responseStatus === VeevaResponseStatus.FAILURE) {
    throw new Error('Failed to establish a connection with Veeva');
  }
}
