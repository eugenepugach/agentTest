import { Transform, TransformCallback } from 'stream';
import { CompositeRetrieveData, QueryBuilder } from '@flosum/salesforce';
import { ORG_COMPONENT_OBJECT_NAME } from '@/modules/tracking-metadata/constants';
import { BaseOptions, SourceMemberData } from '@/modules/tracking-metadata/interfaces/tracking-metadata.interfaces';
import { Logger } from '@/modules/tracking-metadata/job/classes/logger/logger';
import { FLOSUM_NAMESPACE } from '@/constants';

const MAX_CHUNK_SIZE = 4000;

const REVISION_COUNTER_FIELD_NAME = 'RevisionCounter';
const IS_NAME_OBSOLETE = 'IsNameObsolete';
const MEMBER_ID_FIELD_NAME = 'MemberIdOrName';
const MEMBER_TYPE_FIELD_NAME = 'MemberType';
const CHANGED_BY_FIELD_NAME = 'ChangedBy';
const SOURCE_MEMBER_ID_FIELD_NAME = `${FLOSUM_NAMESPACE}Source_Member_Id__c`;
const ORGANIZATION_NAME_FIELD = `${FLOSUM_NAMESPACE}OrganisationName__c`;
const REVISION_COUNTER_CUSTOM_FIELD_NAME = `${FLOSUM_NAMESPACE}Revision_Counter__c`;
const ORG_COMPONENT_SELECT_FIELDS = [
  `Id`,
  `${FLOSUM_NAMESPACE}Revision_Counter__c`,
  `${FLOSUM_NAMESPACE}Component_Type__c`,
  `${FLOSUM_NAMESPACE}API_Name__c`,
  `${FLOSUM_NAMESPACE}Name__c`,
  `${FLOSUM_NAMESPACE}Source_Member_Id__c`,
  `${FLOSUM_NAMESPACE}OrganisationName__c`,
  `${FLOSUM_NAMESPACE}Attachment_ID__c`,
  `${FLOSUM_NAMESPACE}Folder__c`,
];

export interface SourceMemberHandlerOptions extends BaseOptions {
  targetOrgId: string;
  logger: Logger;
}

export class SourceMemberHandler extends Transform {
  private readonly api: SourceMemberHandlerOptions['apiVersion'];
  private readonly instance: SourceMemberHandlerOptions['instance'];
  private readonly targetOrgId: SourceMemberHandlerOptions['targetOrgId'];
  private readonly logger: SourceMemberHandlerOptions['logger'];

  private sourceMemberRecords: Map<string, Record<string, any>> = new Map<string, Record<string, any>>();
  private handledMembersCounter: number = 0;

  public constructor({ apiVersion, instance, targetOrgId, logger }: SourceMemberHandlerOptions) {
    super({ objectMode: true });

    this.api = apiVersion;
    this.instance = instance;
    this.targetOrgId = targetOrgId;
    this.logger = logger;
  }

  private buildOrgComponentQuery(): QueryBuilder {
    return new QueryBuilder()
      .select(...ORG_COMPONENT_SELECT_FIELDS)
      .from(ORG_COMPONENT_OBJECT_NAME)
      .where(`${SOURCE_MEMBER_ID_FIELD_NAME} IN (:sourceMemberIds)`, {
        sourceMemberIds: [...this.sourceMemberRecords.keys()],
      })
      .andWhere(`${ORGANIZATION_NAME_FIELD} = :targetOrgId`, {
        targetOrgId: this.targetOrgId,
      });
  }

  private async getComponentFromFlosum(): Promise<Map<string, Record<string, any>>> {
    const retriever = new CompositeRetrieveData({
      api: this.api,
      queryBuilder: this.buildOrgComponentQuery(),
      instance: this.instance,
      isTooling: false,
    });

    const recordsMap: Map<string, Record<string, any>> = new Map<string, Record<string, any>>();

    do {
      const { records } = await retriever.execute();

      for (const record of records) {
        recordsMap.set(record[SOURCE_MEMBER_ID_FIELD_NAME], record);
      }
    } while (!retriever.getIsDone());

    return recordsMap;
  }

  private async addToChunk(record: Record<string, any>): Promise<void> {
    this.sourceMemberRecords.set(record.Id, record);

    if (this.sourceMemberRecords.size === MAX_CHUNK_SIZE) {
      await this.handle();
    }
  }

  private async handle(): Promise<void> {
    const orgComponentRecords = await this.getComponentFromFlosum();

    for (const [index, sourceMemberRecord] of this.sourceMemberRecords) {
      const orgComponentRecord = orgComponentRecords.get(index);

      if (
        orgComponentRecord &&
        sourceMemberRecord[REVISION_COUNTER_FIELD_NAME] === orgComponentRecord[REVISION_COUNTER_CUSTOM_FIELD_NAME]
      ) {
        continue;
      }

      const handlerRecord: SourceMemberData = {
        sourceMemberId: sourceMemberRecord['Id'],
        componentId: orgComponentRecord?.Id || null,
        attachmentId: orgComponentRecord?.Attachment_ID__c || null,
        metadataId: sourceMemberRecord[MEMBER_ID_FIELD_NAME],
        metadataType: sourceMemberRecord[MEMBER_TYPE_FIELD_NAME],
        isNameObsolete: sourceMemberRecord[IS_NAME_OBSOLETE],
        revisionCounter: sourceMemberRecord[REVISION_COUNTER_FIELD_NAME],
        changedBy: sourceMemberRecord[CHANGED_BY_FIELD_NAME],
      };

      this.handledMembersCounter++;

      this.push(handlerRecord);
    }

    this.sourceMemberRecords = new Map<string, Record<string, any>>();
  }

  public async _transform(record: Record<string, any>, _: BufferEncoding, callback: TransformCallback): Promise<void> {
    try {
      await this.addToChunk(record);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  public async _flush(callback: TransformCallback): Promise<void> {
    try {
      if (this.sourceMemberRecords.size) {
        await this.handle();
      }

      this.logger.log(`Changes found for ${this.handledMembersCounter} components`);
      await this.logger.update();

      callback();
    } catch (error) {
      callback(error);
    }
  }
}
