import { ChunkItem } from '@retrieve-metadata-job/interfaces/job.interfaces';
import { DeclarativeFilterLine } from '@flosum/salesforce';

export interface AuthDetails {
  accessToken: string;
  instanceUrl: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface DeclarativeFilter {
  filters: DeclarativeFilterLine[];
  logic: string;
}

export interface RetrieveMetadataBody {
  credentials: AuthDetails;
  declarativeFilter: DeclarativeFilter | null;
  metadataTypes: string[] | null;
  maxChunkSize?: number;
  maxChunkItems?: number;
  apiVersion: string;
}

export interface CreateRetrieveJobResult {
  jobId: string;
}

export interface RetrieveMetadataJobLogsResult {
  date: number;
  type: string;
  message: string;
}

export interface RetrieveMetadataResult {
  data: ChunkItem[];
}
