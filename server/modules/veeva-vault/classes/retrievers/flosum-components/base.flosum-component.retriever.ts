import { FlosumComponentRetriever } from '@/modules/veeva-vault/interfaces/retriever.interfaces';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { FLOSUM_NAMESPACE } from '@/constants';
import { FlosumComponentDto } from '@/modules/veeva-vault/dtos/flosum-component.dto';

export type BaseFlosumComponentRetrieverOptions<T> = {
  value: T;
  salesforceService: SalesforceService;
};

export abstract class BaseFlosumComponentRetriever<T> implements FlosumComponentRetriever {
  protected value: BaseFlosumComponentRetrieverOptions<T>['value'];
  protected salesforceService: BaseFlosumComponentRetrieverOptions<T>['salesforceService'];

  constructor({ value, salesforceService }: BaseFlosumComponentRetrieverOptions<T>) {
    this.value = value;
    this.salesforceService = salesforceService;
  }

  protected formQuery(whereClause: string): string {
    return `
        SELECT Id, ${FLOSUM_NAMESPACE}Component_Name__c, ${FLOSUM_NAMESPACE}Component_Type__c 
        FROM ${FLOSUM_NAMESPACE}Component__c
        WHERE ${whereClause}`;
  }

  protected abstract getQuery(): string;

  protected formComponents(records: Record<string, any>[]): FlosumComponentDto[] {
    return records.map((component) => new FlosumComponentDto(component));
  }

  public async retrieve(): Promise<FlosumComponentDto[]> {
    const query = this.getQuery();

    const records = await this.salesforceService.retrieveRecords(query);

    return this.formComponents(records);
  }
}
