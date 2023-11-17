import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';
import { VeevaComponentRelationshipDto } from '@/modules/veeva-vault/dtos/veeva-component-relationship.dto';
import { FlosumComponentDto } from '@/modules/veeva-vault/dtos/flosum-component.dto';
import { DeploymentResultDto } from '@/modules/veeva-vault/dtos/deployment-result.dto';

export interface BaseRetriever<T> {
  retrieve(): Promise<T[]>;
}

export type VeevaComponentRetriever = BaseRetriever<VeevaComponentDto>;
export type VeevaComponentRelationshipRetriever = BaseRetriever<VeevaComponentRelationshipDto>;
export type FlosumComponentRetriever = BaseRetriever<FlosumComponentDto>;
export type DeploymentResultRetriever = BaseRetriever<DeploymentResultDto>;
