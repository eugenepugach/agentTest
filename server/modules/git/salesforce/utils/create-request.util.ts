import { deepAssign } from '@/modules/shared/utils';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { RequestError } from '../../../shared/errors/request.error';
import { SalesforceAuthService } from '../services/salesforce-auth.service';
import axiosRetry from 'axios-retry';
import { proxyOptions } from '@/modules/shared/utils/request';

const DEFAULT_REQUEST_DELAY = 2500;

export function createSalesforceRequest(auth: SalesforceAuthService): AxiosInstance {
  const request = axios.create({
    ...proxyOptions(),
  });

  axiosRetry(request, {
    retries: 3,
    retryDelay(count: number) {
      return count * DEFAULT_REQUEST_DELAY;
    },
  });

  request.interceptors.request.use(async (config) => {
    const authConfig = await auth.requestConfig();

    return deepAssign(config, authConfig);
  });

  request.interceptors.response.use(undefined, async (error: AxiosError) => {
    if (error.isAxiosError && error.config) {
      if (error.response?.status === 401) {
        await auth.forceUpdateToken();
        const config = await auth.requestConfig();

        return request(deepAssign(error.config, config));
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
