import { sleep } from '@/modules/shared/utils';
import { BaseAuthDetails } from '@/modules/veeva-vault/interfaces/auth-details.interfaces';

export abstract class BaseVeevaAuth {
  private static WAIT_TIME_UPDATE_TOKEN = 1000;
  private _isUpdatingToken = false;

  protected constructor(public readonly auth: BaseAuthDetails) {}

  public async updateAccessToken(): Promise<void> {
    try {
      if (this._isUpdatingToken) {
        while (this._isUpdatingToken) {
          await sleep(BaseVeevaAuth.WAIT_TIME_UPDATE_TOKEN);
        }
        return;
      }
      this._isUpdatingToken = true;
      this.auth.accessToken = await this.getNewAccessToken();
    } finally {
      this._isUpdatingToken = false;
    }
  }

  protected abstract getNewAccessToken(): Promise<string>;
}
