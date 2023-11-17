import { BaseVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/base.veeva-component.retriever';
import { chunkArray } from '@/modules/shared/utils';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';

export class IdVeevaComponentRetriever extends BaseVeevaComponentRetriever<string[]> {
  protected getEndpointList(): string[] {
    const idListChunks = chunkArray<string>(this.value, VeevaConstants.BUILD_WHERE_BY_ID_LIMIT);

    return idListChunks.map((oneChunk) => this.formQueryEndpoint(`id CONTAINS ('${oneChunk.join(`','`)}')`));
  }
}
