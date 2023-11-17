import axios, { AxiosError, AxiosInstance } from 'axios';
import { AuthParameters } from '@/modules/functions/types/salesforce-request.type';
import axiosRetry from 'axios-retry';
import { RequestError } from '@/modules/shared/errors/request.error';
import { AuthUtils } from '@/modules/functions/utils/auth.utils';
import { FLOSUM_NAMESPACE } from '@/constants';

const DELAY = 2500;

export const namespace = FLOSUM_NAMESPACE ? '/Flosum' : '';

export function createRequest(auth: AuthParameters): AxiosInstance {
  const request = axios.create();

  axiosRetry(request, {
    retries: 3,
    retryDelay(count: number) {
      return count * DELAY;
    },
  });

  request.interceptors.request.use((config) => {
    config.headers.accept = 'application/json';
    config.headers.authorization = `Bearer ${auth.accessToken}`;
    config.baseURL = auth.instanceUrl;
    config.maxBodyLength = 104857600;
    config.maxContentLength = 104857600;

    return config;
  });

  request.interceptors.response.use(undefined, async (error: AxiosError) => {
    if (error.isAxiosError && error.config) {
      if (error.response?.status === 401) {
        auth.accessToken = await AuthUtils.updateAccessToken(
          auth.instanceUrl,
          auth.refreshToken,
          auth.clientId,
          auth.clientSecret
        );

        error.config.headers.authorization = `Bearer ${auth.accessToken}`;
        error.config.baseURL = auth.instanceUrl;

        return request(error.config);
      }
    }

    let data: any = error?.response?.data || {};

    if (Array.isArray(data)) {
      data = data[0];
    }

    const message = data.message || typeof data.error === 'string' ? data.error : data.error?.message || error.message;

    throw new RequestError(message, data);
  });

  return request;
}
