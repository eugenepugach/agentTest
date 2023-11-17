import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { FlosumComponentDto } from '@/modules/veeva-vault/dtos/flosum-component.dto';
import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';
import { VeevaComponentRelationshipDto } from '@/modules/veeva-vault/dtos/veeva-component-relationship.dto';
import { DependencyDataResult } from '@/modules/veeva-vault/interfaces/dependency-data-result.interface';
import { AxiosInstance } from 'axios';
import { DependencyRequestBody } from '@/modules/veeva-vault/interfaces/request-body.interface';
import {
  ErrorResponseBody,
  SuccessDependencyResponseBody,
} from '@/modules/veeva-vault/interfaces/response-body.interfaces';
import { AppResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import { SalesforceService } from '@/modules/veeva-vault/services/salesforce.service';
import { EmptyLogger } from '@/modules/veeva-vault/classes/loggers/empty.logger';
import { FlosumComponentVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/flosum-component.veeva-component.retriever';
import { IdVeevaComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-components/id.veeva-component.retriever';
import { SourceIdVeevaComponentRelationshipRetriever } from '@/modules/veeva-vault/classes/retrievers/veeva-component-relationships/source-id.veeva-component-relationship.retriever';
import { BranchFlosumComponentRetriever } from '@/modules/veeva-vault/classes/retrievers/flosum-components/branch.flosum-component.retriever';

export class DependencyService {
  private readonly _branchId: string;

  private readonly _salesforceService: SalesforceService;
  private readonly _veevaService: VeevaService;

  constructor(
    body: DependencyRequestBody,
    private readonly _connectionSalesforce: AxiosInstance,
    private readonly _connectionVeeva: AxiosInstance
  ) {
    this._branchId = body.branchId;

    const logger = new EmptyLogger();
    this._veevaService = new VeevaService({ connection: this._connectionVeeva, logger });

    this._salesforceService = new SalesforceService({ connection: this._connectionSalesforce });
  }

  private get baseVeevaComponentRetrieverOptions() {
    return {
      veevaService: this._veevaService,
      logger: new EmptyLogger(),
    };
  }

  public async execute(): Promise<SuccessDependencyResponseBody | ErrorResponseBody> {
    const componentList = await this.getFlosumComponents();
    const veevaComponentList = await this.getVeevaComponentsByFlosumComponents(componentList);

    const veevaComponentRelationshipDtoList = await this.getDependencyVeevaComponents(veevaComponentList);

    const veevaIdList = veevaComponentRelationshipDtoList.map((item) => item.targetComponentId);

    const dependencyVeevaComponentList = await this.getVeevaComponentsById(veevaIdList);

    const dependencyResult = DependencyService.createDataResult(
      veevaComponentList,
      dependencyVeevaComponentList,
      veevaComponentRelationshipDtoList
    );

    return {
      responseStatus: AppResponseStatus.SUCCESS,
      data: dependencyResult,
    };
  }

  private async getFlosumComponents(): Promise<FlosumComponentDto[]> {
    const components = await new BranchFlosumComponentRetriever({
      value: this._branchId,
      salesforceService: this._salesforceService,
    }).retrieve();

    if (!components.length) {
      throw new Error('No veeva components found in branch');
    }

    return components;
  }

  private async getVeevaComponentsByFlosumComponents(
    componentList: FlosumComponentDto[]
  ): Promise<VeevaComponentDto[]> {
    const veevaComponentDtos = await new FlosumComponentVeevaComponentRetriever({
      value: componentList,
      ...this.baseVeevaComponentRetrieverOptions,
    }).retrieve();

    if (!veevaComponentDtos.length) {
      throw new Error('No components found in Veeva');
    }

    return veevaComponentDtos;
  }

  private async getVeevaComponentsById(idList: string[]): Promise<VeevaComponentDto[]> {
    const veevaComponentDtos = await new IdVeevaComponentRetriever({
      value: idList,
      ...this.baseVeevaComponentRetrieverOptions,
    }).retrieve();

    if (!veevaComponentDtos.length) {
      throw new Error('No dependency components found in Veeva');
    }

    return veevaComponentDtos;
  }

  private async getDependencyVeevaComponents(
    veevaComponentList: VeevaComponentDto[]
  ): Promise<VeevaComponentRelationshipDto[]> {
    const veevaComponentRelationshipDtoList = await new SourceIdVeevaComponentRelationshipRetriever({
      value: veevaComponentList.map(({ id }) => id),
      veevaService: this._veevaService,
    }).retrieve();

    if (!veevaComponentRelationshipDtoList.length) {
      throw new Error('No relationship found in Veeva');
    }

    return veevaComponentRelationshipDtoList;
  }

  private static createDataResult(
    veevaComponentList: VeevaComponentDto[],
    dependencyVeevaComponentList: VeevaComponentDto[],
    veevaComponentRelationshipDtoList: VeevaComponentRelationshipDto[]
  ): Record<string, DependencyDataResult> {
    const result: Record<string, DependencyDataResult> = {};
    const veevaComponentMap = veevaComponentList.reduce(
      (map, component) => map.set(component.id, component),
      new Map()
    );
    const dependencyVeevaComponentMap = dependencyVeevaComponentList.reduce(
      (map, component) => map.set(component.id, component),
      new Map()
    );

    for (const componentRelationship of veevaComponentRelationshipDtoList) {
      const isComponentsExist =
        veevaComponentMap.has(componentRelationship.sourceComponentId) &&
        dependencyVeevaComponentMap.has(componentRelationship.targetComponentId);
      if (!isComponentsExist) {
        continue;
      }

      const sourceComponent: VeevaComponentDto = veevaComponentMap.get(componentRelationship.sourceComponentId);
      const targetComponent: VeevaComponentDto = dependencyVeevaComponentMap.get(
        componentRelationship.targetComponentId
      );

      if (!result[`${sourceComponent.name}:${sourceComponent.type}`]) {
        result[`${sourceComponent.name}:${sourceComponent.type}`] = {
          dependencies: [],
          label: `${sourceComponent.name} (${sourceComponent.type})`,
          type: sourceComponent.type,
          name: sourceComponent.name,
        };
      }

      result[`${sourceComponent.name}:${sourceComponent.type}`].dependencies.push({
        label: `${targetComponent.name} (${targetComponent.type})`,
        name: targetComponent.name,
        type: targetComponent.type,
        lastUpdate: targetComponent.lastModifiedDate,
        isMissing: !veevaComponentMap.has(componentRelationship.targetComponentId),
      });
    }

    return result;
  }
}
