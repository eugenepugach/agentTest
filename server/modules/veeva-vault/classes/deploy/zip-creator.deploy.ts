import JSZip from 'jszip';
import { SequenceCreatorDeploy } from '@/modules/veeva-vault/classes/deploy/sequence-creator.deploy';
import { Builder } from 'xml2js';
import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import path from 'path';

export type ZipCreatorDeployOptions = {
  attachmentBodies: string[];
  deploymentName: string;
};

const VAULT_PACKAGE_FILENAME = 'vaultpackage.xml';

export class ZipCreatorDeploy {
  private readonly attachmentBodies: ZipCreatorDeployOptions['attachmentBodies'];
  private readonly deploymentName: ZipCreatorDeployOptions['deploymentName'];

  private readonly dependencyFileByName = new Map<string, string>();
  private readonly mdlFileByName = new Map<string, string>();
  private readonly mainZip = new JSZip();

  constructor({ attachmentBodies, deploymentName }: ZipCreatorDeployOptions) {
    this.attachmentBodies = attachmentBodies;
    this.deploymentName = deploymentName;
  }

  private async fillFileByNames(): Promise<void> {
    for (const body of this.attachmentBodies) {
      const zip = new JSZip();
      await zip.loadAsync(body, { base64: true });

      for (const fileName in zip.files) {
        const decodeBody = await zip.file(fileName)?.async('string');

        if (!decodeBody) {
          continue;
        }

        const { name, ext } = path.parse(fileName);

        switch (ext) {
          case VeevaConstants.DEPENDENCY_EXTENSION:
            this.dependencyFileByName.set(name, decodeBody);
            break;
          case VeevaConstants.MDL_EXTENSION:
            this.mdlFileByName.set(name, decodeBody);
            break;
        }
      }
    }
  }

  private addVaultPackageFile(): void {
    const builder = new Builder({
      headless: true,
    });

    const vaultPackage = {
      vaultpackage: {
        $: {
          xmlns: 'https://veevavault.com/',
        },
        name: this.deploymentName,
        source: {
          vault: undefined,
          author: 'Flosum',
        },
        packagetype: 'migration__v',
        summary: 'Deploy',
        description: 'null',
      },
    };

    this.mainZip.file(VAULT_PACKAGE_FILENAME, builder.buildObject(vaultPackage));
  }

  public async execute(): Promise<Buffer> {
    await this.fillFileByNames();

    const sequenceComponents = new SequenceCreatorDeploy({ dependencyFileByName: this.dependencyFileByName }).execute();

    for (const componentName of sequenceComponents) {
      const mdlBody = this.mdlFileByName.get(componentName);

      if (mdlBody) {
        this.mainZip.file(componentName + VeevaConstants.MDL_EXTENSION, mdlBody);
      }
    }

    this.addVaultPackageFile();

    return this.mainZip.generateAsync({ type: 'nodebuffer' });
  }
}
