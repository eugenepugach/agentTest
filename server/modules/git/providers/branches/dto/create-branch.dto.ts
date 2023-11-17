import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class CreateBranchDto {
  @Expose()
  @IsNotEmpty()
  name: string;
}
