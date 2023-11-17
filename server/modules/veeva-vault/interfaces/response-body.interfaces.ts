import { DependencyDataResult } from '@/modules/veeva-vault/interfaces/dependency-data-result.interface';
import { AppResponseStatus } from '@/modules/veeva-vault/enums/status.enums';

export interface SuccessResponseBody {
  responseStatus: AppResponseStatus.SUCCESS;
}

export interface ErrorResponseBody {
  responseStatus: AppResponseStatus.FAILURE;
  responseMessage: string;
}

export interface SuccessDependencyResponseBody extends SuccessResponseBody {
  data: Record<string, DependencyDataResult>;
}
