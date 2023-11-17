import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';
import { VeevaComponentRetriever } from '@/modules/veeva-vault/interfaces/retriever.interfaces';
import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';

export type BaseVeevaComponentRetrieverOptions<T> = {
  value: T;
  veevaService: VeevaService;
  logger: BaseLogger;
};

export abstract class BaseVeevaComponentRetriever<T> implements VeevaComponentRetriever {
  protected value: BaseVeevaComponentRetrieverOptions<T>['value'];
  protected veevaService: BaseVeevaComponentRetrieverOptions<T>['veevaService'];
  protected logger: BaseVeevaComponentRetrieverOptions<T>['logger'];

  constructor({ value, veevaService, logger }: BaseVeevaComponentRetrieverOptions<T>) {
    this.value = value;
    this.veevaService = veevaService;
    this.logger = logger;
  }

  protected formQueryEndpoint(whereClause: string): string {
    const query = `
        SELECT 
            id,
            component_modified_date__sys,
            component_name__v,
            component_type__v, 
            status__v 
        FROM vault_component__v
        WHERE ${whereClause}`;

    return VeevaConstants.ENDPOINT_VQL + query;
  }

  protected abstract getEndpointList(): string[];

  protected filterAndLogByStatus(veevaComponentDtos: VeevaComponentDto[]): VeevaComponentDto[] {
    return veevaComponentDtos.reduce((acc, veevaComponentDto) => {
      const { name, type, status } = veevaComponentDto;

      if (status.includes('inactive__v')) {
        this.logger.log(`Cannot retrieve component with inactive status. Component: ${type}.${name}`);
      } else {
        acc.push(veevaComponentDto);
      }

      return acc;
    }, [] as VeevaComponentDto[]);
  }

  protected formComponents(records: Record<string, any>[]): VeevaComponentDto[] {
    return records.map((component) => new VeevaComponentDto(component));
  }

  public async retrieve(): Promise<VeevaComponentDto[]> {
    this.logger.log('Retrieve collection metadata of components');

    const endpointList = this.getEndpointList();

    const records = await this.veevaService.executeManyVQL(endpointList);

    const veevaComponentDtos = this.formComponents(records);

    return this.filterAndLogByStatus(veevaComponentDtos);
  }
}
