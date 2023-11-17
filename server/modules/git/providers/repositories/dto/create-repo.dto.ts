import { AnyType } from '@/core/types/any.type';
import { Expose, Transform } from 'class-transformer';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class CreateRepoDto {
  @Expose()
  @IsNotEmpty()
  name: string;

  @Expose()
  autoInit?: boolean;

  @Expose()
  defaultBranch?: string;

  @Transform(({ value }) => value ?? true)
  @Expose()
  private?: boolean;

  @Expose()
  apiBody?: AnyType;

  @Expose()
  @IsDefined()
  createHook: boolean;
}
