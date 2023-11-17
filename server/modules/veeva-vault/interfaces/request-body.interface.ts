import { VeevaAuthDetails } from '@/modules/veeva-vault/interfaces/auth-details.interfaces';

export interface RequestBody {
  veevaAuth: VeevaAuthDetails;
}

export interface SnapshotRequestBody extends RequestBody {
  timeZone: string;
  metadataLogId: string;
  attachmentLogId: string;
  snapshotId: string;
  selectedMetaTypes: string[];
  selectedComponentMap: Record<string, string[]>;
}

export interface DeployRequestBody extends RequestBody {
  branchId: string;
  metadataLogId: string;
  attachmentLogId: string;
  organisationId: string;
  timeZone: string;
  organisationName: string;
  componentIdList: string[];
  deploymentName: string;
}

export interface RollbackRequestBody extends RequestBody {
  timeZone: string;
  metadataLogId: string;
  attachmentLogId: string;
  parentMetadataLogId: string;
  componentIds: string[];
}

export interface DependencyRequestBody extends RequestBody {
  branchId: string;
}
