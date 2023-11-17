import { NotFoundError } from '@/core/errors/not-found.error';
import { Service } from 'typedi';
import { FLOSUM_COMMIT, FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE } from '@/constants';
import {
  GET_BRANCH_BY_NAME_QUERY,
  GET_BRANCH_COMPONENTS_BY_FILENAMES_QUERY,
  GET_BRANCH_COMPONENTS_QUERY,
  GET_COMMIT_MANIFESTS_BY_COMPONENT_IDS,
  GET_COMPONENT_RECORD_TYPES_QUERY,
  GET_REPOSITORY_BY_NAME_QUERY,
  GET_REPOSITORY_COMPONENTS_BY_FILENAMES_QUERY,
  GET_REPOSITORY_COMPONENTS_QUERY,
} from '../queries';
import { ComponentMetadata } from '../types/component-metadata.type';
import { ComponentRecordType } from '../types/component-record-type';
import { extractFieldsFromRecord } from '../utils/flosum-naming.utils';
import { SalesforceQueryService } from './salesforce-query.service';
import { SalesforceRestService } from './salesforce-rest.service';

@Service()
export class SalesforceGitSyncService {
  private readonly MAX_QUERY_ARRAY_ITEMS = 200;

  constructor(private queryService: SalesforceQueryService, private restService: SalesforceRestService) {}

  private extractComponentMetadataFromRecord(record: any): ComponentMetadata {
    const object = extractFieldsFromRecord(record, [
      'Component_Name__c',
      'Component_Type__c',
      'CRC32__c',
      'File_Name__c',
      'Version__c',
      'Id',
    ]);

    return {
      id: object.Id,
      name: object.Component_Name__c,
      type: object.Component_Type__c,
      fileName: object.File_Name__c,
      crc32: object.CRC32__c,
      version: +object.Version__c,
    };
  }

  public async getRepositoryIdByName(name: string): Promise<string> {
    const [repository] = await this.queryService.query<any>(GET_REPOSITORY_BY_NAME_QUERY.replace('%name%', name));

    if (!repository) {
      throw new NotFoundError(`Repository "${name}" not found in flosum.`);
    }

    return repository.Id;
  }

  public async getBranchIdByName(name: string): Promise<string> {
    const [branch] = await this.queryService.query<any>(GET_BRANCH_BY_NAME_QUERY.replace('%name%', name));

    if (!branch) {
      throw new NotFoundError(`Branch "${name}" not found in flosum.`);
    }

    return branch.Id;
  }

  public async getComponentRecordTypes(): Promise<ComponentRecordType[]> {
    const records = await this.queryService.query<any>(GET_COMPONENT_RECORD_TYPES_QUERY);

    return records
      .map((record) => extractFieldsFromRecord(record, ['Id', 'Name']))
      .map((object) => ({
        id: object.Id,
        name: object.Name,
      }));
  }

  public async fetchRepositoryComponentsByFilenames(
    fileNames: string[],
    repositoryId: string
  ): Promise<ComponentMetadata[]> {
    const result: any[] = [];

    while (fileNames.length) {
      const query = GET_REPOSITORY_COMPONENTS_BY_FILENAMES_QUERY.replace(
        '%fileNames%',
        fileNames
          .splice(0, this.MAX_QUERY_ARRAY_ITEMS)
          .map((v) => `'${v}'`)
          .join(',')
      ).replace('%repositoryId%', repositoryId);

      const records = await this.queryService.query<any>(query);
      result.push(...records);
    }

    return result.map((record) => this.extractComponentMetadataFromRecord(record));
  }

  public async fetchBranchComponentsByFilenames(fileNames: string[], branchId: string): Promise<ComponentMetadata[]> {
    const result: any[] = [];

    while (fileNames.length) {
      const query = GET_BRANCH_COMPONENTS_BY_FILENAMES_QUERY.replace(
        '%fileNames%',
        fileNames
          .splice(0, this.MAX_QUERY_ARRAY_ITEMS)
          .map((v) => `'${v}'`)
          .join(',')
      ).replace('%branchId%', branchId);

      const records = await this.queryService.query<any>(query);
      result.push(...records);
    }

    return result.map((record) => this.extractComponentMetadataFromRecord(record));
  }

  public async fetchRepositoryComponents(repositoryId: string): Promise<ComponentMetadata[]> {
    const query = GET_REPOSITORY_COMPONENTS_QUERY.replace('%repositoryId%', repositoryId);

    const records = await this.queryService.query<any>(query);

    return records.map((record) => this.extractComponentMetadataFromRecord(record));
  }

  public async fetchBranchComponents(branchId: string): Promise<ComponentMetadata[]> {
    const query = GET_BRANCH_COMPONENTS_QUERY.replace('%branchId%', branchId);

    const records = await this.queryService.query<any>(query);

    return records.map((record) => this.extractComponentMetadataFromRecord(record));
  }

  public async fetchCommitManifestsByComponentIds(ids: string[]): Promise<string[]> {
    const componentIds = [...ids];

    const result: string[] = [];

    while (componentIds.length) {
      const query = GET_COMMIT_MANIFESTS_BY_COMPONENT_IDS.replace(
        '%componentIds%',
        componentIds
          .splice(0, this.MAX_QUERY_ARRAY_ITEMS)
          .map((v) => `'${v}'`)
          .join(',')
      );

      const records = await this.queryService.query<any>(query);
      result.push(...records.map((record) => record.Id));
    }

    return result;
  }

  public async createCommit(message: string, repositoryId: string): Promise<string> {
    return this.restService.post(FLOSUM_COMMIT, {
      [`${FLOSUM_NAMESPACE}Repository__c`]: repositoryId,
      [`${FLOSUM_NAMESPACE}Commit_Name__c`]: message.substr(0, 255),
      [`${FLOSUM_NAMESPACE}Status__c`]: 'Completed',
      [`${FLOSUM_GIT_NAMESPACE}Is_From_Agent__c`]: true,
    });
  }
}
