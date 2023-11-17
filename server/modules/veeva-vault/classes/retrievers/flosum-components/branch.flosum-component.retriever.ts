import { BaseFlosumComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/flosum-components/base.flosum-component.retriever';
import { FLOSUM_NAMESPACE } from '@/constants';

export class BranchFlosumComponentRetriever extends BaseFlosumComponentRetriever<string> {
  protected getQuery(): string {
    return this.formQuery(
      `${FLOSUM_NAMESPACE}Branch__c = '${this.value}' AND ${FLOSUM_NAMESPACE}Veeva_Component__c = true`
    );
  }
}
