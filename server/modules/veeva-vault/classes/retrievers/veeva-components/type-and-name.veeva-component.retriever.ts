import { BaseVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/base.veeva-component.retriever';
import { chunkArray } from '@/modules/shared/utils';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';

export class TypeAndNameVeevaComponentRetriever extends BaseVeevaComponentRetriever<Record<string, string[]>> {
  protected formComponents(records: Record<string, any>[]): VeevaComponentDto[] {
    const componentUniqueNames = Object.keys(this.value)
      .map((type) => this.value[type].map((name) => `${type}.${name}`.toLowerCase()))
      .flat()
      .reduce((set, uniqueName) => set.add(uniqueName), new Set<string>());

    return records
      .map((component) => new VeevaComponentDto(component))
      .filter(({ name, type }) => componentUniqueNames.has(`${type}.${name}`.toLowerCase()));
  }

  protected getEndpointList(): string[] {
    const componentNames = new Set(Object.values(this.value).flat());
    const componentNameChunks = chunkArray<string>(
      Array.from(componentNames),
      VeevaConstants.BUILD_WHERE_BY_NAME_LIMIT
    );

    return componentNameChunks.map((oneChunk) =>
      this.formQueryEndpoint(`component_name__v CONTAINS ('${oneChunk.join(`','`)}')`)
    );
  }
}
