import { JobStatus } from '@/modules/shared/enums/logger.enums';

export interface JobState {
  id: string;
  status: JobStatus;
  createdDate: number | null;
  completedDate: number | null;
  error: string | null;
  warnings: string[];
}
