import { BaseVeevaComponentRetrieverOptions } from '@/modules/veeva-vault/classes/retrievers/veeva-components/base.veeva-component.retriever';
import { TypeAndNameVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/type-and-name.veeva-component.retriever';
import { PackageComponentDto } from '@/modules/veeva-vault/dtos/package-component.dto';

export class PackageComponentVeevaComponentRetriever extends TypeAndNameVeevaComponentRetriever {
  constructor({ value, ...baseOptions }: BaseVeevaComponentRetrieverOptions<PackageComponentDto[]>) {
    const componentMap = value.reduce((acc, component) => {
      const { type, name } = component;

      if (!acc[type]) {
        acc[type] = [];
      }

      acc[type].push(name);

      return acc;
    }, {} as Record<string, string[]>);

    super({ value: componentMap, ...baseOptions });
  }
}
