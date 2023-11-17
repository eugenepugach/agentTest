import { Service } from 'typedi';
import {
  FLOSUM_GIT_NAMESPACE,
  FLOSUM_NAMESPACE,
  SYNC_ATTACHMENT_FOR_BRANCH_NAME,
  SYNC_ATTACHMENT_FOR_REPOSITORY_NAME,
} from '@/constants';
import { ERR_INVALID_ATTACHMENT_ID } from '@/constants/errors';
import { encodeBase64 } from '../../../shared/utils';
import { RemoteState } from '@/modules/git/devops/types/remote-state.type';
import { FlosumRepositorySyncDto } from '../dto/flosum-repository-sync.dto';
import { SyncStatus } from '../enums/sync-status.enum';
import { SalesforceNotFoundError } from '../errors/not-found.error';
import {
  GET_ATTACHMENT_BY_PARENT_ID_AND_NAME_QUERY,
  GET_BRANCH_BY_NAME_QUERY,
  GET_BRANCH_QUERY,
  GET_COMPONENTS_QUERY,
  GET_REPOSITORIES_NAMES_QUERY,
  GET_REPOSITORY_BY_NAME_QUERY,
  GET_REPOSITORY_QUERY,
  GET_WAITING_BRANCHES_QUERY,
  GET_WAITING_REPOSITORIES_QUERY,
} from '../queries';
import { SalesforceQueryService } from './salesforce-query.service';
import { SalesforceService } from './salesforce.service';

@Service()
export class SalesforceSyncService {
  constructor(private salesforceQuery: SalesforceQueryService, private salesforceService: SalesforceService) {}

  private async getComponents(query: string): Promise<string[]> {
    const records = await this.salesforceQuery.query<any>(query);

    const componentIds: string[] = [];

    for (const record of records) {
      const historyRecords: any[] = record[`${FLOSUM_NAMESPACE}Components__r`]?.records;

      if (historyRecords && historyRecords.length) {
        componentIds.push(historyRecords[0].Id);
      }
    }

    return componentIds;
  }

  async getAllRepositoryNames(connectionId: string): Promise<string[]> {
    const records = await this.salesforceQuery.query(
      GET_REPOSITORIES_NAMES_QUERY.replace(/\%connection_id\%/g, connectionId)
    );

    return records.map((record: any) => {
      return record[`${FLOSUM_GIT_NAMESPACE}Repository__r`]
        ? record[`${FLOSUM_GIT_NAMESPACE}Repository__r`].Name
        : record.Name;
    });
  }

  async getRepositoryRecords(connectionId: string): Promise<FlosumRepositorySyncDto[]> {
    const records = await this.salesforceQuery.query(
      GET_WAITING_REPOSITORIES_QUERY.replace(/\%connection_id\%/g, connectionId)
    );
    return records.map((record: any) => FlosumRepositorySyncDto.fromRepositoryRecord(record));
  }

  async getBranchRecords(repositoriesIds: string): Promise<FlosumRepositorySyncDto[]> {
    const records = await this.salesforceQuery.query(
      GET_WAITING_BRANCHES_QUERY.replace(/%repositories_ids\%/g, repositoriesIds)
    );

    return records.map((record: any) => FlosumRepositorySyncDto.fromBranchRecord(record));
  }

  async getRepositoryRecord(id: string): Promise<FlosumRepositorySyncDto> {
    const records: any[] = await this.salesforceQuery.query(GET_REPOSITORY_QUERY.replace('%id%', id));

    if (records.length === 0) {
      throw new SalesforceNotFoundError(`Repository with Id ${id} not found on salesforce`);
    }

    return FlosumRepositorySyncDto.fromRepositoryRecord(records[0]);
  }

  async getBranchRecord(id: string): Promise<FlosumRepositorySyncDto> {
    const records: any[] = await this.salesforceQuery.query(GET_BRANCH_QUERY.replace('%id%', id));

    if (records.length === 0) {
      throw new SalesforceNotFoundError(`Branch with Id ${id} not found on salesforce`);
    }

    return FlosumRepositorySyncDto.fromBranchRecord(records[0]);
  }

  async getBranchRecordByName(name: string): Promise<FlosumRepositorySyncDto> {
    const records: any[] = await this.salesforceQuery.query(GET_BRANCH_BY_NAME_QUERY.replace('%name%', name));

    if (records.length === 0) {
      throw new SalesforceNotFoundError(`Branch ${name} not found on salesforce`);
    }

    const branch = records.find((record) => record[`${FLOSUM_NAMESPACE}Branch_Name__c`] === name);

    if (!branch) {
      throw new SalesforceNotFoundError(`Branch ${name} not found on salesforce`);
    }

    return FlosumRepositorySyncDto.fromBranchRecord(branch);
  }

  async getRepositoryRecordByName(name: string): Promise<FlosumRepositorySyncDto> {
    const records: any[] = await this.salesforceQuery.query(GET_REPOSITORY_BY_NAME_QUERY.replace('%name%', name));

    if (records.length === 0) {
      throw new SalesforceNotFoundError(`Repository ${name} not found on salesforce`);
    }

    return FlosumRepositorySyncDto.fromRepositoryRecord(records[0]);
  }

  async getComponentsFromRepository(repositoryId: string): Promise<string[]> {
    const query = `
      ${GET_COMPONENTS_QUERY}
      WHERE 
        %flosum_namespace%Repository__c ='${repositoryId}'`;

    return this.getComponents(query);
  }

  async getBranchComponents(branchId: string): Promise<string[]> {
    const query = `
        ${GET_COMPONENTS_QUERY}
        WHERE 
          %flosum_namespace%Branch__c = '${branchId}'`;

    return this.getComponents(query);
  }

  async getAttachmentId(syncDto: FlosumRepositorySyncDto): Promise<string> {
    const query = GET_ATTACHMENT_BY_PARENT_ID_AND_NAME_QUERY.replace('%parentId%', syncDto.objectId).replace(
      '%name%',
      syncDto.repositoryId ? SYNC_ATTACHMENT_FOR_REPOSITORY_NAME : SYNC_ATTACHMENT_FOR_BRANCH_NAME
    );

    const data: any = await this.salesforceQuery.query(query);

    const id = data[0]?.Id;

    if (!id) {
      throw new Error(ERR_INVALID_ATTACHMENT_ID);
    }

    return id;
  }

  async getRemoteStateAttachmentId(syncDto: FlosumRepositorySyncDto): Promise<string> {
    let remoteStateAttachmentId = await this.getAttachmentId(syncDto).catch(() => null);

    if (!remoteStateAttachmentId) {
      remoteStateAttachmentId = await this.salesforceService.createObject('Attachment', {
        Body: encodeBase64('{}'),
        ParentId: syncDto.objectId,
        ContentType: 'text/plain',
        Name: syncDto.repositoryId ? SYNC_ATTACHMENT_FOR_REPOSITORY_NAME : SYNC_ATTACHMENT_FOR_BRANCH_NAME,
      });
    }

    return remoteStateAttachmentId;
  }

  async updateRemoteState(syncDto: FlosumRepositorySyncDto, remoteState: RemoteState): Promise<void> {
    const attachmentId = await this.getRemoteStateAttachmentId(syncDto);

    await this.salesforceService.patchObject('Attachment', attachmentId, {
      Body: encodeBase64(JSON.stringify(remoteState)),
    });
  }

  async setStatus(syncDto: FlosumRepositorySyncDto, status: SyncStatus): Promise<void> {
    await this.salesforceService.patchObject(syncDto.objectType, syncDto.objectId, {
      [`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`]: status,
    });
  }

  async disableSync(id: string): Promise<void> {
    await this.salesforceService.patchObject(`${FLOSUM_GIT_NAMESPACE}Connection__c`, id, {
      [`${FLOSUM_GIT_NAMESPACE}Sync_In_Progress__c`]: false,
    });
  }
}
