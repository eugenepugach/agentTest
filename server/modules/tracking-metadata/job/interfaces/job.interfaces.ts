import { AuthDetails } from '@/modules/shared/interfaces/auth.interfaces';

export interface TrackingMetadataManifest {
  flosumOrgCredentials: AuthDetails;
  targetOrgCredentials: AuthDetails;
  apiVersion: string;
  targetOrgId: string;
  trackingSettingId: string;
  lastRetrieveDate: string;
  metadataTypes: string[];
  timeZone: string;
}
