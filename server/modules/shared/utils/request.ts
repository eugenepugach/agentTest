import { ERR_GIT_SERVICE_UNAVAILABLE } from '@/constants/errors';
import { InternalServerError } from '@/core/errors/internal-server.error';
import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { TooManyRequests } from '@/core/errors/too-many-requests.error';
import { RequestError } from '../errors/request.error';
import { Agent } from 'https';
import HttpsProxyAgent from 'https-proxy-agent/dist/agent';

export function proxyOptions(): Pick<AxiosRequestConfig, 'httpsAgent' | 'proxy'> {
  let httpsAgent: Agent | undefined = undefined;

  if (process.env.HTTP_PROXY) {
    httpsAgent = new HttpsProxyAgent(process.env.HTTP_PROXY);

    httpsAgent.options.rejectUnauthorized = false;
  }

  return {
    proxy: false,
    httpsAgent,
  };
}

export function requestWrapper(request: AxiosInstance): AxiosInstance {
  request.interceptors.response.use(
    (response) => response.data,
    (error: AxiosError) => {
      if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
        throw new InternalServerError(ERR_GIT_SERVICE_UNAVAILABLE);
      }

      if (error?.code === 'ERR_SOCKET_CLOSED') {
        throw new BadRequestError('Socket is closed. Connection to remote server was closed without any reason/error.');
      }

      if (error.response?.status === 429) {
        throw new TooManyRequests(error);
      }

      const data: any = error?.response?.data || {};

      const message =
        data.message || typeof data.error === 'string' ? data.error : data.error?.message || error.message;

      throw new RequestError(message, data);
    }
  );

  return request;
}
