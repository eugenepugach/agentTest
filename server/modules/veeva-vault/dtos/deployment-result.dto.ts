import { PackageDeploymentAction } from '@/modules/veeva-vault/enums/status.enums';
import { FLOSUM_NAMESPACE } from '@/constants';

export class DeploymentResultDto {
  id: string;
  name: string;
  type: string;
  stepName: string;
  result: PackageDeploymentAction;

  constructor(component: Record<string, any>) {
    this.id = component[`Id`];
    this.type = component[`${FLOSUM_NAMESPACE}Component_Type__c`];
    this.name = component[`${FLOSUM_NAMESPACE}Component_Name__c`];
    this.stepName = component[`${FLOSUM_NAMESPACE}Veeva_Step_Name__c`];
    this.result = component[`${FLOSUM_NAMESPACE}Result__c`];
  }
}
