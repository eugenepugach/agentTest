import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaComponentRelationshipRetriever } from '@/modules/veeva-vault/interfaces/retriever.interfaces';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { VeevaComponentRelationshipDto } from '@/modules/veeva-vault/dtos/veeva-component-relationship.dto';

export type BaseVeevaComponentRelationshipRetrieverOptions<T> = {
  value: T;
  veevaService: VeevaService;
};

export abstract class BaseVeevaComponentRelationshipRetriever<T> implements VeevaComponentRelationshipRetriever {
  protected value: BaseVeevaComponentRelationshipRetrieverOptions<T>['value'];
  protected veevaService: BaseVeevaComponentRelationshipRetrieverOptions<T>['veevaService'];

  constructor({ value, veevaService }: BaseVeevaComponentRelationshipRetrieverOptions<T>) {
    this.value = value;
    this.veevaService = veevaService;
  }

  protected formQueryEndpoint(whereClause: string): string {
    const query = `
        SELECT 
            id, 
            name__v, 
            source_component__sys, 
            target_component__sys, 
            target_component_name__sys, 
            created_date__v 
         FROM vault_component_relationship__sys
         WHERE ${whereClause}`;

    return VeevaConstants.ENDPOINT_VQL + query;
  }

  protected abstract getEndpointList(): string[];

  protected deleteDuplicates(
    veevaComponentRelationshipDtoList: VeevaComponentRelationshipDto[]
  ): VeevaComponentRelationshipDto[] {
    const uniqueComponentsMap = veevaComponentRelationshipDtoList.reduce(
      (map, component) => map.set(`${component.sourceComponentId}.${component.targetComponentId}`, component),
      new Map()
    );
    return [...uniqueComponentsMap.values()];
  }

  protected formComponents(records: Record<string, any>[]): VeevaComponentRelationshipDto[] {
    return records.map((component) => new VeevaComponentRelationshipDto(component));
  }

  public async retrieve(): Promise<VeevaComponentRelationshipDto[]> {
    const endpointList = this.getEndpointList();

    const records = await this.veevaService.executeManyVQL(endpointList);

    const veevaComponentRelationshipDtos = this.formComponents(records);

    return this.deleteDuplicates(veevaComponentRelationshipDtos);
  }
}
