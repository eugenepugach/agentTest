import JSZip from 'jszip';
import { DeploymentResultDto } from '@/modules/veeva-vault/dtos/deployment-result.dto';
import { FactoryBodyCreatorRollback } from '@/modules/veeva-vault/classes/rollback/body-creator/factory.body-creator.rollback';
import { Builder } from 'xml2js';

export type ZipCreatorRollbackOptions = {
  deploymentResults: DeploymentResultDto[];
  rollbackName: string;
  backup: string;
};

export class ZipCreatorRollback {
  private readonly _deploymentResults: ZipCreatorRollbackOptions['deploymentResults'];
  private readonly _rollbackName: ZipCreatorRollbackOptions['rollbackName'];
  private readonly _backup: ZipCreatorRollbackOptions['backup'];

  private _backupZip: JSZip;
  private _zip: JSZip;

  constructor({ deploymentResults, backup, rollbackName }: ZipCreatorRollbackOptions) {
    this._deploymentResults = deploymentResults;
    this._rollbackName = rollbackName;
    this._backup = backup;
  }

  private async createZips(): Promise<void> {
    this._backupZip = new JSZip();
    this._zip = new JSZip();

    await this._backupZip.loadAsync(this._backup, { base64: true });
  }

  private sortDeploymentResults(): void {
    this._deploymentResults.sort((a, b) => (a.stepName < b.stepName ? 1 : b.stepName < a.stepName ? -1 : 0));
  }

  private async fillZip(): Promise<void> {
    for (const deploymentResult of this._deploymentResults) {
      const body = await FactoryBodyCreatorRollback.create({
        deploymentResult,
        backupZip: this._backupZip,
      }).create();

      const { type, name } = deploymentResult;

      this._zip.file(`${type}.${name}.mdl`, body);
    }

    const builder = new Builder({
      headless: true,
    });
    const vaultPackage = {
      vaultpackage: {
        $: {
          xmlns: 'https://veevavault.com/',
        },
        name: this._rollbackName,
        source: {
          vault: undefined,
          author: 'Flosum',
        },
        packagetype: 'migration__v',
        summary: 'Rollback',
        description: 'null',
      },
    };

    this._zip.file('vaultpackage.xml', builder.buildObject(vaultPackage));
  }

  public async create(): Promise<Buffer> {
    await this.createZips();

    this.sortDeploymentResults();

    await this.fillZip();

    return this._zip.generateAsync({ type: 'nodebuffer' });
  }
}
