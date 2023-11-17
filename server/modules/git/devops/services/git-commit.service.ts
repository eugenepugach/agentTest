import {
  FLOSUM_BRANCH,
  FLOSUM_GIT_NAMESPACE,
  FLOSUM_NAMESPACE,
  FLOSUM_REPOSITORY,
  META_XML_EXTENSION,
} from '@/constants';
import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';
import { SyncStatus } from '@/modules/git/salesforce/enums/sync-status.enum';
import { SalesforceGitSyncService } from '@/modules/git/salesforce/services/salesforce-git-sync.service';
import { SalesforceRestService } from '@/modules/git/salesforce/services/salesforce-rest.service';
import { ComponentMetadata } from '@/modules/git/salesforce/types/component-metadata.type';
import { ComponentRecordType } from '@/modules/git/salesforce/types/component-record-type';
import { Service } from 'typedi';
import { FlosumRepositorySyncDto } from '../../salesforce/dto/flosum-repository-sync.dto';
import { SalesforceSyncService } from '../../salesforce/services/salesforce-sync.service';
import { SalesforceService } from '../../salesforce/services/salesforce.service';
import { GitCommitDto } from '../dto/git-commit.dto';
import { ListOfParsedComponents } from '../types/list-of-parsed-components.type';
import { RemoteState } from '../types/remote-state.type';
import { filterParserPaths, readFilesByFilename } from '@/modules/git/parsers/utils';
import { FactoryParser } from '@/modules/git/parsers/mdapi/factory.parser';
import { isVlocityComponent } from '@/modules/git/parsers/utils/vlocity';

@Service({ transient: true })
export class GitCommitService {
  private readonly TASKS_PER_TICK = 200;

  private gitCommit: GitCommitDto;
  private syncRecord: FlosumRepositorySyncDto;
  private recordTypes: ComponentRecordType[];
  private componentsMetadata: ComponentMetadata[];

  private get repositoryId() {
    return this.syncRecord?.repositoryId || '';
  }

  private get branchId() {
    return this.syncRecord?.branchId || '';
  }

  constructor(
    private salesforceGitSync: SalesforceGitSyncService,
    private salesforceRest: SalesforceRestService,
    private salesforceSync: SalesforceSyncService,
    private salesforce: SalesforceService
  ) {}

  public async createCommit(message: string): Promise<string> {
    return this.salesforceGitSync.createCommit(message, this.repositoryId);
  }

  public async checkSyncStatus(hash: string): Promise<boolean> {
    if (this.syncRecord) {
      const remoteStateId = await this.salesforceSync.getRemoteStateAttachmentId(this.syncRecord);
      const remoteState = await this.salesforce
        .retrieveAttachment<RemoteState>(remoteStateId)
        .then((value) => (typeof value === 'string' ? JSON.parse(value) : value))
        .catch(() => ({} as RemoteState));

      if (remoteState[this.gitCommit.repositoryGit]) {
        if (remoteState[this.gitCommit.repositoryGit].lastCommit === hash) {
          return true;
        }
      }

      return false;
    }

    return false;
  }

  public async updateRemoteState(state: RemoteState): Promise<void> {
    if (this.syncRecord) {
      await this.salesforceSync.updateRemoteState(this.syncRecord, state);
    }
  }

  public getUnusedComponentsFilePaths(): string[] {
    return this.componentsMetadata.map(({ fileName }) => fileName);
  }

  public async proceedFile(filePath: string, dir: string, isSFDXProject: boolean): Promise<ListOfParsedComponents> {
    const fileNameMatcher = new RegExp(`^${filePath}([./-]{1}|$)`);
    let paths = [filePath];

    if (isSFDXProject && !isVlocityComponent(filePath)) {
      paths = filterParserPaths(await readFilesByFilename(filePath, dir).catch(() => []));
    }

    const componentsMetadata = isSFDXProject
      ? this.componentsMetadata.filter((meta) => meta.fileName.match(fileNameMatcher))
      : this.componentsMetadata.filter(
          (meta) => meta.fileName === filePath || meta.fileName === filePath.replace(META_XML_EXTENSION, '')
        );

    const parser = FactoryParser.create(dir, paths);
    const parsedComponents = await parser.parse();

    const componentsToCreate: ParsedComponent[] = [];
    const componentsToUpdate: { component: ParsedComponent; meta: ComponentMetadata }[] = [];

    for (const component of parsedComponents) {
      const meta = componentsMetadata.find((meta) => meta.name === component.name && meta.type === component.type);

      if (!meta) {
        componentsToCreate.push(component);
        continue;
      }

      if (component.crc !== meta.crc32) {
        componentsToUpdate.push({
          meta,
          component,
        });
      }

      componentsMetadata.splice(componentsMetadata.indexOf(meta), 1);
    }

    return {
      inserted: componentsToCreate,
      modified: componentsToUpdate,
      removed: componentsMetadata,
    };
  }

  public async fetchRepositoryOrBranchData(): Promise<void> {
    this.syncRecord =
      this.gitCommit.branch === 'master'
        ? await this.salesforceSync.getRepositoryRecordByName(this.gitCommit.repository)
        : await this.salesforceSync.getBranchRecordByName(this.gitCommit.branch);

    this.recordTypes = await this.salesforceGitSync.getComponentRecordTypes();
  }

  public async fetchComponentsMetadata(isSFDXProject: boolean): Promise<void> {
    if (this.gitCommit.force || isSFDXProject) {
      this.componentsMetadata = this.branchId
        ? await this.salesforceGitSync.fetchBranchComponents(this.branchId)
        : await this.salesforceGitSync.fetchRepositoryComponents(this.repositoryId);
      return;
    }

    const fileNames = [...new Set(this.gitCommit.fileNames.map((path) => path.replace(META_XML_EXTENSION, '')))];

    this.componentsMetadata = [];

    while (fileNames.length) {
      const fileNamesToRetrieve = fileNames.splice(0, this.TASKS_PER_TICK);

      const metadata: ComponentMetadata[] = this.branchId
        ? await this.salesforceGitSync.fetchBranchComponentsByFilenames(fileNamesToRetrieve, this.branchId)
        : await this.salesforceGitSync.fetchRepositoryComponentsByFilenames(fileNamesToRetrieve, this.repositoryId);

      this.componentsMetadata.push(...metadata);
    }
  }

  public async updateStatus(status: SyncStatus): Promise<void> {
    if (this.branchId) {
      await this.salesforceRest.patch(FLOSUM_BRANCH, this.branchId, {
        [`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`]: status,
        [`${FLOSUM_NAMESPACE}Last_Updated_On__c`]: Date.now(),
      });
    } else {
      await this.salesforceRest.patch(FLOSUM_REPOSITORY, this.repositoryId, {
        [`${FLOSUM_GIT_NAMESPACE}Synchronization_Status__c`]: status,
      });
    }
  }

  public setCommitDto(commitDto: GitCommitDto): void {
    this.gitCommit = commitDto;
  }

  public getRecordTypes(): ComponentRecordType[] {
    return this.recordTypes;
  }

  public getRepositoryId(): string {
    return this.repositoryId;
  }

  public getBranchId(): string {
    return this.branchId;
  }
}
