import { DeploymentResultDto } from '@/modules/veeva-vault/dtos/deployment-result.dto';
import JSZip from 'jszip';

export type BaseBodyCreatorRollbackOptions = {
  deploymentResult: DeploymentResultDto;
  backupZip: JSZip;
};

export abstract class BaseBodyCreatorRollback {
  protected readonly deploymentResult: BaseBodyCreatorRollbackOptions['deploymentResult'];
  protected readonly backupZip: BaseBodyCreatorRollbackOptions['backupZip'];

  constructor({ deploymentResult, backupZip }: BaseBodyCreatorRollbackOptions) {
    this.deploymentResult = deploymentResult;
    this.backupZip = backupZip;
  }

  protected get fileName(): string {
    const { name, type } = this.deploymentResult;
    const fileName = Object.keys(this.backupZip.files).find((file) => file.endsWith(`${type}.${name}.mdl`));

    return fileName || '';
  }

  public abstract create(): Promise<string>;
}
