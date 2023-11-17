import { VeevaAuthDetails } from '@/modules/veeva-vault/interfaces/auth-details.interfaces';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import axios from 'axios';
import { VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import { sleep } from '@/modules/shared/utils';
import { AppConstants } from '@/modules/veeva-vault/constants/app.constants';
import { BaseVeevaAuth } from '@/modules/veeva-vault/classes/auth/base-veeva-auth';

export class VeevaAuth extends BaseVeevaAuth {
  private static readonly LOGIN_TIMEOUT = 1000 * 60;

  constructor(public readonly auth: VeevaAuthDetails, private readonly attemptsOfUpdateToken: number = 0) {
    super(auth);
  }

  protected async getNewAccessToken(attempts = this.attemptsOfUpdateToken): Promise<string> {
    const endpoint = this.auth.instanceUrl + VeevaConstants.ENDPOINT_AUTH;
    const urlencoded = new URLSearchParams();
    urlencoded.append('username', this.auth.username);
    urlencoded.append('password', this.auth.password);
    const { data } = await axios.post(endpoint, urlencoded, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (data.responseStatus === VeevaResponseStatus.SUCCESS) {
      return data.sessionId as string;
    } else {
      const isHandledError = data.errors?.some(
        (error: Record<string, any>) => error.type === VeevaConstants.API_LIMIT_EXCEEDED
      );

      if (isHandledError && attempts > 0) {
        await sleep(VeevaAuth.LOGIN_TIMEOUT);
        return await this.getNewAccessToken(attempts - 1);
      } else {
        throw new Error(data.errors[0]?.message || AppConstants.UNDEFINED_ERROR);
      }
    }
  }
}
