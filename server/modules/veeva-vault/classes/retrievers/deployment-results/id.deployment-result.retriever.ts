import { BaseDeploymentResultRetriever } from '@/modules/veeva-vault/classes/retrievers/deployment-results/base.deployment-result.retriever';

export class IdDeploymentResultRetriever extends BaseDeploymentResultRetriever<string[]> {
  protected getQuery(): string {
    return this.formQuery(`Id IN ('${this.value.join(`','`)}')`);
  }
}
