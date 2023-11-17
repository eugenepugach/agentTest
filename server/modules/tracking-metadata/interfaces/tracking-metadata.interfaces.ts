import { ListMetadataItem } from '@flosum/salesforce';
import { AxiosInstance } from 'axios';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';

export interface AuthDetails {
  accessToken: string;
  instanceUrl: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface TrackingMetadataBody {
  flosumOrgCredentials: AuthDetails;
  targetOrgCredentials: AuthDetails;
  apiVersion: string;
  lastRetrieveDate: string;
  targetOrgId: string;
  trackingSettingId: string;
  metadataTypes: string[];
  timeZone: string;
}

export interface TrackingMetadataJobResult {
  jobId: string;
}

export interface BaseOptions {
  apiVersion: string;
  instance: AxiosInstance;
  logger: Logger;
}

export interface SourceMemberData extends Record<string, any> {
  sourceMemberId: string;
  metadataId: string;
  metadataType: string;
  changedBy: string;
  componentId: string | null;
  attachmentId: string | null;
  isNameObsolete: boolean;
  revisionCounter: number;
}

export interface MetadataRetrieverRecord {
  listMetadataItem: ListMetadataItem;
  sourceMemberRecord: SourceMemberData;
  files: Record<string, Buffer>;
}
