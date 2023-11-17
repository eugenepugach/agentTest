import { BaseVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/base.veeva-component.retriever';

export class TypeVeevaComponentRetriever extends BaseVeevaComponentRetriever<string[]> {
  protected getEndpointList(): string[] {
    const endpoint = this.formQueryEndpoint(`component_type__v CONTAINS ('${this.value.join(`','`)}')`);

    return [endpoint];
  }
}
