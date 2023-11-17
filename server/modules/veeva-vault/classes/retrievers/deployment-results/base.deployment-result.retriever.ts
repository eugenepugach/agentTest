import { DeploymentResultRetriever } from '@/modules/veeva-vault/interfaces/retriever.interfaces';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { FLOSUM_NAMESPACE } from '@/constants';
import { DeploymentResultDto } from '@/modules/veeva-vault/dtos/deployment-result.dto';

export type BaseDeploymentResultRetrieverOptions<T> = {
  value: T;
  salesforceService: SalesforceService;
};

export abstract class BaseDeploymentResultRetriever<T> implements DeploymentResultRetriever {
  protected value: BaseDeploymentResultRetrieverOptions<T>['value'];
  protected salesforceService: BaseDeploymentResultRetrieverOptions<T>['salesforceService'];

  constructor({ value, salesforceService }: BaseDeploymentResultRetrieverOptions<T>) {
    this.value = value;
    this.salesforceService = salesforceService;
  }

  protected formQuery(whereClause: string): string {
    return `
        SELECT 
            Id, 
            ${FLOSUM_NAMESPACE}Component_Name__c, 
            ${FLOSUM_NAMESPACE}Component_Type__c, 
            ${FLOSUM_NAMESPACE}Veeva_Step_Name__c, 
            ${FLOSUM_NAMESPACE}Result__c
        FROM ${FLOSUM_NAMESPACE}Deployment_Result__c
        WHERE ${whereClause}`;
  }

  protected abstract getQuery(): string;

  protected formComponents(records: Record<string, any>[]): DeploymentResultDto[] {
    return records.map((component) => new DeploymentResultDto(component));
  }

  public async retrieve(): Promise<DeploymentResultDto[]> {
    const query = this.getQuery();

    const records = await this.salesforceService.retrieveRecords(query);

    return this.formComponents(records);
  }
}
