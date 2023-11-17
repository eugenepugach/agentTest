import { ListMetadataItem } from '@flosum/salesforce';
import { DeclarativeFilter } from '@/modules/retrieve-metadata/interfaces/retrieve-metadata.interfaces';
import { AuthDetails } from '@/modules/shared/interfaces/auth.interfaces';

export interface RetrieveMetadataManifest {
  credentials: AuthDetails;
  declarativeFilter: DeclarativeFilter | null;
  metadataTypes: string[] | null;
  maxChunkSize?: number;
  maxChunkItems?: number;
  apiVersion: string;
}

export type ChunkItem = ListMetadataItem & {
  zip: string;
};
