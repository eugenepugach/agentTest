import { chunkArray } from '@/modules/shared/utils';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { BaseVeevaComponentRelationshipRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-component-relationships/base.veeva-component-relationship.retriever';

export class SourceIdVeevaComponentRelationshipRetriever extends BaseVeevaComponentRelationshipRetriever<string[]> {
  protected getEndpointList(): string[] {
    const idListChunks = chunkArray<string>(this.value, VeevaConstants.BUILD_WHERE_BY_ID_LIMIT);

    return idListChunks.map((oneChunk) =>
      this.formQueryEndpoint(`source_component__sys CONTAINS ('${oneChunk.join(`','`)}')`)
    );
  }
}
