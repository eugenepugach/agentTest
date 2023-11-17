import { Expose } from 'class-transformer';
import { IsNotEmpty, IsNotEmptyObject, ValidateNested } from 'class-validator';

export class FlosumCommitUserDto {
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsNotEmpty()
  @Expose()
  email: string;
}

export class FlosumCommitDto {
  @Expose()
  commitId: string;

  @IsNotEmptyObject()
  @ValidateNested()
  @Expose()
  user: FlosumCommitUserDto;

  @IsNotEmpty()
  @Expose()
  message: string;

  @Expose()
  syncRepositoryId: string;

  @Expose()
  syncBranchId: string;

  @Expose()
  commitAttachmentId: string;

  @Expose()
  deleteAttachmentId: string;

  @Expose()
  isSingleOperation: boolean;
}
