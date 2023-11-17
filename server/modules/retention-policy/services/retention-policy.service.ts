import { CronJob } from 'cron';
import { RetentionPolicy } from '@/modules/retention-policy/interfaces/retention-policy.interface';

export class RetentionPolicyService {
  private readonly CRON_TIME = '0 0 0 * * *';

  private readonly _retentionPolicies: RetentionPolicy[];

  constructor(retentionPolicies: RetentionPolicy[]) {
    this._retentionPolicies = retentionPolicies;
  }

  public startScheduler(): void {
    new CronJob(
      this.CRON_TIME,
      async () => {
        for (const retentionPolicy of this._retentionPolicies) {
          await retentionPolicy.execute();
        }
      },
      null,
      true
    );
  }
}
