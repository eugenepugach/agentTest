import { AxiosInstance } from 'axios';
import { FlosumConstants } from '@/modules/veeva-vault/constants/flosum.constants';
import { BaseVeevaError } from '@/modules/veeva-vault/classes/errors/base-veeva-error';
import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';

export class Logger implements BaseLogger {
  public body: string;
  private connection: AxiosInstance;
  private readonly attachmentId: string;
  private readonly timeZone: string;

  constructor(connection: AxiosInstance, timeZone: string, attachmentId: string) {
    this.connection = connection;
    this.timeZone = timeZone;
    this.attachmentId = attachmentId;
    this.body = '';
  }

  public log(line: string): void {
    const time = this.getTimeString();
    this.body += `${time} ${line}\n`;
  }

  public logError(error: Error | BaseVeevaError<any>): void {
    this.log('Error:');
    if (error instanceof BaseVeevaError) {
      error.getMessages().forEach((item) => this.log(`${item}`));
    } else {
      this.log(error.message);
    }
  }

  public async updateLog(): Promise<string> {
    const attachment = {
      Body: Buffer.from(this.body).toString('base64'),
    };
    const { data } = await this.connection.patch(
      `${FlosumConstants.ENDPOINT_UPSERT_RECORD}/Attachment/${this.attachmentId}`,
      attachment
    );
    return data.Id;
  }

  private getTimeString(): string {
    const date = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: this.timeZone,
      })
    );
    const dateObject: Record<string, any> = {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };

    for (const [key, value] of Object.entries(dateObject)) {
      dateObject[key] = value < 10 ? `0${value}` : `${value}`;
    }
    const { year, month, day, hours, minutes, seconds } = dateObject;
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
