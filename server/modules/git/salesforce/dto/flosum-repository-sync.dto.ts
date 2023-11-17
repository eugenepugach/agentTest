import { FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE } from '../../../../constants';
import { SyncStatus } from '../enums/sync-status.enum';

export enum SyncDirection {
  FlosumToGit,
  GitToFlosum,
}

export class FlosumRepositorySyncDto {
  public objectId: string;
  public objectType: string;

  public repositoryId: string;
  public repositoryName: string;

  public branchId: string;
  public branchName: string;

  public status: SyncStatus;

  public direction: SyncDirection;

  public static fromRepositoryRecord(record: Record<string, any>): FlosumRepositorySyncDto {
    const dto = new FlosumRepositorySyncDto();

    dto.objectId = record[`${FLOSUM_GIT_NAMESPACE}Repository__c`]
      ? record[`${FLOSUM_GIT_NAMESPACE}Repository__c`]
      : record.Id;
    dto.objectType = record[`${FLOSUM_GIT_NAMESPACE}Repository__c`]
      ? `${FLOSUM_NAMESPACE}Repository__c`
      : record.attributes?.type;
    dto.repositoryId = record[`${FLOSUM_GIT_NAMESPACE}Repository__c`]
      ? record[`${FLOSUM_GIT_NAMESPACE}Repository__c`]
      : record.Id;
    dto.repositoryName = record[`${FLOSUM_GIT_NAMESPACE}Repository__r`]
      ? record[`${FLOSUM_GIT_NAMESPACE}Repository__r`].Name
      : record.Name;
    dto.status = record[`${FLOSUM_GIT_NAMESPACE}Repository__r`]
      ? record[`${FLOSUM_GIT_NAMESPACE}Repository__r`][`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`]
      : record[`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`];
    dto.branchName = 'master';
    dto.direction = (
      record[`${FLOSUM_GIT_NAMESPACE}Repository__r`]
        ? record[`${FLOSUM_GIT_NAMESPACE}Repository__r`][`${FLOSUM_GIT_NAMESPACE}Synchronization_Direction__c`]
        : record[`${FLOSUM_GIT_NAMESPACE}Synchronization_Direction__c`]
    )
      ? SyncDirection.GitToFlosum
      : SyncDirection.FlosumToGit;

    return dto;
  }

  public static fromBranchRecord(record: Record<string, any>): FlosumRepositorySyncDto {
    const dto = new FlosumRepositorySyncDto();

    dto.objectId = record.Id;
    dto.objectType = record.attributes?.type;
    dto.branchId = record.Id;
    dto.status = record[`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`];
    dto.branchName = record[`${FLOSUM_NAMESPACE}Branch_Name__c`];
    dto.repositoryName = record[`${FLOSUM_NAMESPACE}Repository__r`]?.Name;
    dto.direction = record[`${FLOSUM_GIT_NAMESPACE}Synchronization_Direction__c`]
      ? SyncDirection.GitToFlosum
      : SyncDirection.FlosumToGit;

    return dto;
  }
}
