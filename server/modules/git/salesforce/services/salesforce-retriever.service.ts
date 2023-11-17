import { Logger } from '@/core';
import { SalesforceService } from './salesforce.service';
import { FlosumComponent } from '../types/flosum-component.type';
import Container from 'typedi';
import { SalesforceQueryService } from './salesforce-query.service';
import { GET_ATTACHMENT_BY_PARENT_IDS_QUERY, GET_COMPONENT_HISTORIES_BY_IDS } from '../queries';
import { AttachmentRecord } from '../types/attachment-record.type';
import { FlosumComponentHistoryDto } from '../dto/flosum-component-history.dto';

export class SalesforceRetrieverService {
  private logger = new Logger(SalesforceRetrieverService.name);
  private readonly COMPONENTS_PER_REQUEST = 3000;
  private readonly COMPONENTS_PER_QUERY = 500;

  constructor(private salesforceService: SalesforceService) {}

  public async retrieveComponentIdsFromHistoryIds(ids: string[]): Promise<
    {
      fileType: string;
      fileName: string;
      attachmentId: string;
    }[]
  > {
    this.logger.info('manually retrieving component ids from history ids (%d)', ids.length);

    const queryService = Container.get(SalesforceQueryService);

    const historyIds = ids.map((id) => `'${id}'`);

    const componentsData: {
      fileType: string;
      fileName: string;
      attachmentId: string;
    }[] = [];

    while (historyIds.length) {
      const idsToRetrieve = historyIds.splice(0, this.COMPONENTS_PER_QUERY);

      const attachmentsPromise = queryService.query<AttachmentRecord>(
        GET_ATTACHMENT_BY_PARENT_IDS_QUERY.replace('%parent_ids%', idsToRetrieve.join())
      );

      const historiesPromise = queryService
        .query<any>(GET_COMPONENT_HISTORIES_BY_IDS.replace('%ids%', idsToRetrieve.join()))
        .then((records) => records.map((record) => FlosumComponentHistoryDto.fromSalesforce(record)));

      const [attachments, histories] = await Promise.all([attachmentsPromise, historiesPromise]);

      for (const history of histories) {
        const attachment = attachments.find((a) => a.ParentId === history.id) as AttachmentRecord;

        if (attachment) {
          componentsData.push({
            fileType: attachment.Name,
            fileName: history.filename,
            attachmentId: attachment.Id,
          });
        }
      }
    }

    return componentsData;
  }

  private async retrieveLastComponents(ids: string[]): Promise<FlosumComponent[]> {
    const componentsData = await this.retrieveComponentIdsFromHistoryIds(ids);

    this.logger.info('manually retrieving components from salesforce');

    const components: FlosumComponent[] = [];

    for (const componentData of componentsData) {
      const component = await this.salesforceService.retrieveAttachment<Buffer>(componentData.attachmentId, true);
      components.push({
        body: component.toString('base64'),
        fileName: componentData.fileName,
        fileType: componentData.fileType,
      });
      this.logger.info('manually retrieved %d/%d components', components.length, ids.length);
    }

    return components;
  }

  public async run(ids: string[]): Promise<FlosumComponent[]> {
    const componentIds = [...ids];

    const components: FlosumComponent[] = [];
    const bigComponentIds: string[] = [];

    while (componentIds.length) {
      const idsToRecieve = componentIds.splice(0, this.COMPONENTS_PER_REQUEST);

      const response = await this.salesforceService.retrieveComponents(idsToRecieve);

      if (idsToRecieve.length !== response.ids.length) {
        componentIds.push(...response.ids);
        components.push(...response.components);
      } else {
        bigComponentIds.push(...idsToRecieve);
      }

      this.logger.log('retrieved %d/%d components from salesforce rest', ids.length - componentIds.length, ids.length);
    }

    if (bigComponentIds.length) {
      const lastComponents = await this.retrieveLastComponents(bigComponentIds);

      components.push(...lastComponents);
    }

    return components;
  }
}
