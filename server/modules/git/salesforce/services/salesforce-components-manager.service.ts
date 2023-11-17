import {
  FLOSUM_ATTACHMENT,
  FLOSUM_COMMIT_MANIFEST,
  FLOSUM_COMPONENT,
  FLOSUM_COMPONENT_HISTORY,
  FLOSUM_GIT_NAMESPACE,
  FLOSUM_NAMESPACE,
} from '@/constants';
import { Logger } from '@/core';
import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';
import { Zip } from '@/modules/git/parsers/utils/zip';
import Container from 'typedi';
import { ListOfParsedComponents } from '@/modules/git/devops/types/list-of-parsed-components.type';
import { SalesforceError } from '../errors/salesforce.error';
import { ComponentMetadata } from '../types/component-metadata.type';
import { ComponentRecordType } from '../types/component-record-type';
import { ProceededComponentMeta } from '../types/proceeded-component-meta.type';
import { CompositeRequestBody } from '../types/salesforce-composite.type';
import { createDeleteRequest, createPatchRequest, createPostRequest } from '../utils/composite.utils';
import { extractFieldsFromRecord } from '../utils/flosum-naming.utils';
import { SalesforceGitSyncService } from './salesforce-git-sync.service';

export class SalesforceComponentsManager {
  private logger = new Logger(SalesforceComponentsManager.name);
  private gitSync: SalesforceGitSyncService = Container.get(SalesforceGitSyncService);

  constructor(
    private repositoryId: string,
    private branchId: string,
    private username: string,
    private recordTypes: ComponentRecordType[],
    private proceededComponentsMeta: ProceededComponentMeta[]
  ) {}

  private proceedComponentMeta(component: Record<string, any>, reference: string): void {
    const object = extractFieldsFromRecord(component, ['Component_Type__c', 'Component_Name__c', 'Version__c']);

    this.proceededComponentsMeta.push({
      componentId: '',
      reference,
      version: object.Version__c,
      componentName: object.Component_Name__c,
      componentType: object.Component_Type__c,
    });
  }

  private prepareCommitManifest(commitId: string, historyId: string): CompositeRequestBody {
    const { request } = createPostRequest(FLOSUM_COMMIT_MANIFEST, {
      [`${FLOSUM_NAMESPACE}Commit__c`]: commitId,
      [`${FLOSUM_NAMESPACE}Component_History__c`]: historyId,
    });

    return request;
  }

  private async prepareComponentAttachmentRecord(
    component: ParsedComponent,
    parentId: string
  ): Promise<Record<string, any>> {
    const attachmentRecord: Record<string, any> = {};

    const zip = Zip.createZip();

    for (const filePath of Object.keys(component.files)) {
      zip.file(filePath, component.files[filePath], {
        createFolders: true,
      });
    }

    attachmentRecord.ContentType = 'application/zip';
    attachmentRecord.Name = component.type;
    attachmentRecord.Description = component.type;
    attachmentRecord.ParentId = parentId;
    attachmentRecord.Body = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return attachmentRecord;
  }

  private prepareComponentHistoryRecord(
    component: ParsedComponent,
    parentId: string,
    version?: number
  ): Record<string, any> {
    const date = new Date().toISOString();
    const historyRecord: Record<string, any> = {};

    historyRecord[`${FLOSUM_NAMESPACE}Component__c`] = parentId;
    historyRecord[`${FLOSUM_NAMESPACE}CRC32__c`] = component.crc;
    historyRecord[`${FLOSUM_NAMESPACE}Changed_On__c`] = date;
    historyRecord[`${FLOSUM_NAMESPACE}Changed_By__c`] = this.username;
    historyRecord[`${FLOSUM_NAMESPACE}Version__c`] = version ? version + 1 : 1;
    historyRecord[`${FLOSUM_GIT_NAMESPACE}Is_From_Agent__c`] = true;

    return historyRecord;
  }

  private prepareComponentRecord(component: ParsedComponent, meta?: ComponentMetadata): Record<string, any> {
    const date = new Date().toISOString();
    const componentRecord: Record<string, any> = {};

    if (!meta) {
      if (this.branchId) {
        componentRecord[`${FLOSUM_NAMESPACE}Branch__c`] = this.branchId;
        componentRecord[`${FLOSUM_NAMESPACE}Source__c`] = 'Branch';
        componentRecord.RecordTypeId = this.recordTypes.find((type) => type.name === 'Branch')?.id;
      } else {
        componentRecord[`${FLOSUM_NAMESPACE}Repository__c`] = this.repositoryId;
        componentRecord[`${FLOSUM_NAMESPACE}Source__c`] = 'Repository';
        componentRecord.RecordTypeId = this.recordTypes.find((type) => type.name === 'Repository')?.id;
      }

      componentRecord[`${FLOSUM_NAMESPACE}Version__c`] = 1;
    } else {
      componentRecord[`${FLOSUM_NAMESPACE}Version__c`] = meta.version + 1;
    }

    componentRecord[`${FLOSUM_NAMESPACE}Component_Type__c`] = component.type;
    componentRecord[`${FLOSUM_NAMESPACE}Component_Name__c`] = component.name;
    componentRecord[`${FLOSUM_NAMESPACE}File_Name__c`] = component.filePath;
    componentRecord[`${FLOSUM_NAMESPACE}Last_Updated_By__c`] = this.username;
    componentRecord[`${FLOSUM_NAMESPACE}Last_Modified_By__c`] = this.username;
    componentRecord[`${FLOSUM_NAMESPACE}Last_Modified_Date__c`] = date;
    componentRecord[`${FLOSUM_NAMESPACE}Committed_On__c`] = date;
    componentRecord[`${FLOSUM_NAMESPACE}CRC32__c`] = component.crc;

    componentRecord[`${FLOSUM_NAMESPACE}Vlocity_Component_Name__c`] = component.vlocityComponentName;
    componentRecord[`${FLOSUM_NAMESPACE}Vlocity_Component__c`] = component.isVlocityComponent;

    return componentRecord;
  }

  public getProceededComponentsMeta(): ProceededComponentMeta[] {
    return this.proceededComponentsMeta;
  }

  public async insert(components: ParsedComponent[], commitId?: string): Promise<CompositeRequestBody[]> {
    const requests: CompositeRequestBody[] = [];

    for (const component of components) {
      const componentInfo = createPostRequest(FLOSUM_COMPONENT, this.prepareComponentRecord(component));
      const historyInfo = createPostRequest(
        FLOSUM_COMPONENT_HISTORY,
        this.prepareComponentHistoryRecord(component, `@{${componentInfo.reference}.id}`)
      );
      const attachmentInfo = createPostRequest(
        FLOSUM_ATTACHMENT,
        await this.prepareComponentAttachmentRecord(component, `@{${historyInfo.reference}.id}`)
      );

      this.proceedComponentMeta(componentInfo.request.body as Record<string, any>, componentInfo.reference);

      requests.push(componentInfo.request, historyInfo.request, attachmentInfo.request);

      if (commitId) {
        requests.push(this.prepareCommitManifest(commitId, `@{${historyInfo.reference}.id}`));
      }
    }

    return requests;
  }

  public async update(
    componentsToUpdate: { component: ParsedComponent; meta: ComponentMetadata }[],
    commitId = ''
  ): Promise<CompositeRequestBody[]> {
    const requests: CompositeRequestBody[] = [];

    for (const { component, meta } of componentsToUpdate) {
      if (!meta.id) {
        const proceededMeta = this.proceededComponentsMeta.find(
          (meta) => meta.componentName === component.name && meta.componentType === component.type
        );

        if (!proceededMeta) {
          throw new SalesforceError(
            new Error(`Could not proceed component ${component.name} [${component.type}] - meta not found`)
          );
        }

        meta.id = proceededMeta.componentId;
      }

      const componentInfo = createPatchRequest(FLOSUM_COMPONENT, meta.id, this.prepareComponentRecord(component, meta));
      const historyInfo = createPostRequest(
        FLOSUM_COMPONENT_HISTORY,
        this.prepareComponentHistoryRecord(component, meta.id, meta.version)
      );
      const attachmentInfo = createPostRequest(
        FLOSUM_ATTACHMENT,
        await this.prepareComponentAttachmentRecord(component, `@{${historyInfo.reference}.id}`)
      );

      this.proceedComponentMeta(componentInfo.request.body as Record<string, any>, componentInfo.reference);

      requests.push(componentInfo.request, historyInfo.request, attachmentInfo.request);

      if (commitId) {
        requests.push(this.prepareCommitManifest(commitId, `@{${historyInfo.reference}.id}`));
      }
    }

    return requests;
  }

  public async delete(
    components: ListOfParsedComponents['removed'],
    fromRepository = false
  ): Promise<{
    manifests: CompositeRequestBody[];
    componentsToUpdate: CompositeRequestBody[];
    componentsToDelete: CompositeRequestBody[];
  }> {
    const requests: {
      manifests: CompositeRequestBody[];
      componentsToUpdate: CompositeRequestBody[];
      componentsToDelete: CompositeRequestBody[];
    } = {
      manifests: [],
      componentsToDelete: [],
      componentsToUpdate: [],
    };

    const componentIds: string[] = [];

    for (const component of components) {
      if (component.id) {
        componentIds.push(component.id);
      } else {
        const meta = this.proceededComponentsMeta.find(
          (meta) => meta.componentName === component.name && meta.componentType === component.type
        );

        if (!meta || !meta.componentId) {
          continue;
        }

        componentIds.push(meta.componentId);
      }
    }

    if (fromRepository) {
      const commitManifests = await this.gitSync.fetchCommitManifestsByComponentIds(componentIds);
      requests.manifests = commitManifests.map((id) => createDeleteRequest(FLOSUM_COMMIT_MANIFEST, id).request);
    }

    requests.componentsToUpdate = componentIds.map(
      (id) =>
        createPatchRequest(FLOSUM_COMPONENT, id, {
          [`${FLOSUM_GIT_NAMESPACE}Deletion_By_Agent__c`]: true,
        }).request
    );
    requests.componentsToDelete = componentIds.map((id) => createDeleteRequest(FLOSUM_COMPONENT, id).request);

    return requests;
  }
}
