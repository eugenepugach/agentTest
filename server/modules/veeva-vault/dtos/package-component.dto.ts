import {
  PackageComponentStatus,
  PackageDeploymentAction,
  VeevaDeploymentStatus,
} from '@/modules/veeva-vault/enums/status.enums';
import { VeevaPackageComponent } from '@/modules/veeva-vault/interfaces/veeva-response.interfaces';

export type PackageComponentDtoCreationAttributes = {
  component: VeevaPackageComponent;
  status: VeevaDeploymentStatus;
  stepName: string;
};

export class PackageComponentDto {
  public stepName: string;
  public name: string;
  public type: string;
  public status: PackageComponentStatus;
  public deploymentAction: PackageDeploymentAction;

  public get uniqueName(): string {
    return `${this.type}.${this.name}`;
  }

  constructor({ component, stepName, status }: PackageComponentDtoCreationAttributes) {
    this.name = component.component_name__v;
    this.type = component.component_type__v;
    this.stepName = stepName;
    this.status = PackageComponentDto.convertDeploymentStatus(status);
  }

  private static convertDeploymentStatus(status: VeevaDeploymentStatus): PackageComponentStatus {
    switch (status) {
      case VeevaDeploymentStatus.ERROR:
        return PackageComponentStatus.ERROR;
      case VeevaDeploymentStatus.DEPLOYED:
      case VeevaDeploymentStatus.DEPLOYED_WITH_WARNING:
        return PackageComponentStatus.DEPLOYED;
      case VeevaDeploymentStatus.VERIFIED:
        return PackageComponentStatus.VERIFIED;
      default:
        throw new Error(`Unknown package component status: ${status}`);
    }
  }

  public static convertDeploymentAction(deploymentAction: string): PackageDeploymentAction {
    if (deploymentAction.startsWith('Add')) {
      return PackageDeploymentAction.CREATED;
    }

    if (deploymentAction.startsWith('Update')) {
      return PackageDeploymentAction.UPDATED;
    }

    if (deploymentAction.startsWith('No Change')) {
      return PackageDeploymentAction.NO_CHANGE;
    }

    if (deploymentAction.startsWith('DROP')) {
      return PackageDeploymentAction.DELETED;
    }

    throw new Error(`Unknown Deployment Action '${deploymentAction}'`);
  }
}
