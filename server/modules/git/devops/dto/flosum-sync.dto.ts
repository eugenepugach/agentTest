import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class FlosumSyncDto {
  @Expose()
  createHooks: boolean;

  @IsNotEmpty()
  @Expose()
  syncID: string;
}
