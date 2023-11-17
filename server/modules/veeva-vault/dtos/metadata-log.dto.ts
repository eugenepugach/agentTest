import { FLOSUM_NAMESPACE } from '@/constants';

export class MetadataLogDto {
  id: string;
  name: string;
  branchId: string;
  organizationId: string;
  organizationName: string;

  constructor(metadataLog: Record<string, any>) {
    this.id = metadataLog[`Id`];
    this.name = metadataLog[`Name`];
    this.branchId = metadataLog[`${FLOSUM_NAMESPACE}Branch__c`];
    this.organizationId = metadataLog[`${FLOSUM_NAMESPACE}Organisation__c`];

    const { [`${FLOSUM_NAMESPACE}Organisation__r`]: organization } = metadataLog;
    this.organizationName = organization?.Name || null;
  }
}
