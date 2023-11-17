import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import { VeevaAuth } from '@/modules/veeva-vault/classes/auth/veeva-auth';
import { VeevaRequestError } from '@/modules/veeva-vault/classes/errors/veeva-request-error';

const DELAY = 2500;
const MAX_BODY_LENGTH = 104857600;
const MAX_CONTENT_LENGTH = 104857600;
const VALID_RESPONSE_TYPES_TO_PARSE = ['arraybuffer', 'text'];

export function createVeevaRequest(veevaAuth: VeevaAuth): AxiosInstance {
  const { auth } = veevaAuth;
  const request = axios.create();

  axiosRetry(request, {
    retries: 3,
    retryDelay(count: number) {
      return count * DELAY;
    },
  });

  request.interceptors.request.use((config) => {
    config.headers.accept ||= 'application/json';
    config.headers.authorization = `${auth.accessToken}`;
    config.baseURL = auth.instanceUrl;
    config.maxBodyLength = MAX_BODY_LENGTH;
    config.maxContentLength = MAX_CONTENT_LENGTH;

    return config;
  });

  request.interceptors.response.use(
    async (response: AxiosResponse) => {
      const isJSON = response.headers['content-type']?.includes('application/json');

      if (!isJSON) {
        return response;
      }

      const isNeedParse: boolean = VALID_RESPONSE_TYPES_TO_PARSE.includes(<string>response.config.responseType);
      const veevaResponse = isNeedParse ? JSON.parse(response.data) : response.data;

      if (veevaResponse.responseStatus === VeevaResponseStatus.SUCCESS) {
        return response;
      }

      const isNotHandledError = veevaResponse.errors.every(
        (error: Record<string, any>) => error.type !== VeevaConstants.INVALID_SESSION_ID
      );
      const isFormData = (response.config.headers?.['Content-Type'] + '').startsWith('multipart/form-data');

      if (isNotHandledError || isFormData) {
        return response;
      }

      await veevaAuth.updateAccessToken();
      return request(response.config);
    },
    async (error: AxiosError) => {
      const data: any = error?.response?.data || error.message || VeevaConstants.VEEVA_UNDEFINED_ERROR;

      throw new VeevaRequestError(data.errors || data);
    }
  );

  return request;
}
