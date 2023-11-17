import { BaseVeevaComponentRetrieverOptions } from '@/modules/veeva-vault/classes/retrievers/veeva-components/base.veeva-component.retriever';
import { FlosumComponentDto } from '@/modules/veeva-vault/dtos/flosum-component.dto';
import { TypeAndNameVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/type-and-name.veeva-component.retriever';

export class FlosumComponentVeevaComponentRetriever extends TypeAndNameVeevaComponentRetriever {
  constructor({ value, ...baseOptions }: BaseVeevaComponentRetrieverOptions<FlosumComponentDto[]>) {
    const componentMap = value.reduce((acc, component) => {
      const { componentType, componentName } = component;

      if (!acc[componentType]) {
        acc[componentType] = [];
      }

      acc[componentType].push(componentName);

      return acc;
    }, {} as Record<string, string[]>);

    super({ value: componentMap, ...baseOptions });
  }
}
