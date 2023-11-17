import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { VeevaRequestError } from '@/modules/veeva-vault/classes/errors/veeva-request-error';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';
import { SalesforceAuth } from '@/modules/veeva-vault/classes/auth/salesforce-auth';

const DELAY = 2500;
const MAX_BODY_LENGTH = 104857600;
const MAX_CONTENT_LENGTH = 104857600;

export function createSalesforceRequest(salesforceAuth: SalesforceAuth): AxiosInstance {
  const { auth } = salesforceAuth;
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
    config.maxBodyLength = MAX_BODY_LENGTH;
    config.maxContentLength = MAX_CONTENT_LENGTH;

    return config;
  });

  request.interceptors.response.use(undefined, async (error: AxiosError) => {
    if (error.isAxiosError && error.config) {
      if (error.response?.status === 401) {
        await salesforceAuth.updateAccessToken();
        return request(error.config);
      }
    }

    const data: any = error?.response?.data || error.message || FlosumConstants.SALESFORCE_UNDEFINED_ERROR;

    throw new VeevaRequestError(data);
  });

  return request;
}
