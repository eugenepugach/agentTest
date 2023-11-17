import { FLOSUM_NAMESPACE } from '@/constants';
import { BranchFlosumComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/flosum-components/branch.flosum-component.retriever';

export class BranchComponentHistoryFlosumComponentRetriever extends BranchFlosumComponentRetriever {
  protected formQuery(whereClause: string): string {
    return `
          SELECT
                  Id,
                  ${FLOSUM_NAMESPACE}Component_Name__c,
                  ${FLOSUM_NAMESPACE}Component_Type__c,
                  (SELECT Id FROM ${FLOSUM_NAMESPACE}Components__r ORDER BY ${FLOSUM_NAMESPACE}Version__c DESC LIMIT 1)
          FROM ${FLOSUM_NAMESPACE}Component__c
          WHERE ${whereClause}`;
  }
}
