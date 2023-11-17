import { JobStatus, ObjectStatus } from '@data-masking-job/enums/logger.enums';

export interface JobState {
  id: string;
  status: JobStatus;
  createdDate: number;
  completedDate?: number;
  processed?: ObjectState[];
  error?: string;
  successful: number;
  failed: number;
}

export interface ObjectState {
  name: string;
  status: ObjectStatus;
  successful: number;
  failed: number;
}

export interface LogMessage {
  date: number;
  message: string;
  objectName?: string;
}
