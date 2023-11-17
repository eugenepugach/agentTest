import axios, { AxiosInstance } from 'axios';
import { setTimeout } from 'timers/promises';
import { proxyOptions, requestWrapper } from '@/modules/shared/utils/request';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { BaseCredentialsDto } from '@/modules/git/providers/credentials/dto/base-credentials.dto';

export abstract class GitApiService<C extends BaseCredentialsDto> {
  private numberOfRequestsInQueue = 0;

  protected MAX_REQUEST_PER_HOUR = -1;
  protected request: AxiosInstance;

  private get requestInterval(): number {
    return (60 * 60 * 1000) / this.MAX_REQUEST_PER_HOUR;
  }

  constructor(protected readonly provider: GitProvider, protected readonly credentials: C) {
    this.request = this.createRequest();
  }

  protected abstract getHeaders(): Record<string, any>;

  public createRequest(baseURL?: string): AxiosInstance {
    const request = axios.create({
      baseURL: baseURL || this.credentials.getBaseUrl(),
      headers: this.getHeaders(),
      ...proxyOptions(),
    });

    request.interceptors.request.use(async (config) => {
      const sleepTime = this.numberOfRequestsInQueue++ * this.requestInterval;

      await setTimeout(sleepTime);

      this.numberOfRequestsInQueue -= 1;
      return config;
    });

    return requestWrapper(request);
  }

  public abstract isLoggedIn(): Promise<boolean>;
}
