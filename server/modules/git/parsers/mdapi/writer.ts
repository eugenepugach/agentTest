import path from 'path';
import { Logger } from '@/core';
import { AnyType } from '@/core/types/any.type';
import { FS } from '../../internal/fs.internal';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { InvalidXmlError } from '../errors/invalid-xml.error';
import { XmlV2 as Xml } from '../utils/xml-v2';
import { Zip } from '../utils/zip';
import childTypes from '../data/child-types';

type MDApiWriterOptions = {
  components: FlosumComponent[];
  sourceDir: string;
  skipChildErrors: boolean;
};

export class MDApiWriter {
  private MAX_WRITES_PER_TICK = 100;
  private parentComponents: Record<string, AnyType> = {};
  private readonly components: FlosumComponent[];
  private readonly sourceDir: string;
  private readonly skipChildErrors: boolean;
  private internalLogger = new Logger(MDApiWriter.name);

  constructor({ components, sourceDir, skipChildErrors }: MDApiWriterOptions) {
    this.components = components;
    this.sourceDir = sourceDir;
    this.skipChildErrors = skipChildErrors;
  }

  private async readZip(zip: string, asBuffer = false) {
    const archive = await Zip.unzip(zip);

    const result: { filename: string; body: string | Buffer }[] = [];

    for (const filename of Object.keys(archive.files)) {
      if (!archive.files[filename].dir) {
        result.push({
          filename,
          body: await archive.files[filename].async(asBuffer ? 'nodebuffer' : 'text'),
        });
      }
    }

    return result;
  }

  private async writeParent(component: FlosumComponent): Promise<void> {
    try {
      const zip = await this.readZip(component.body, true);
      await Promise.all(zip.map(({ filename, body }) => FS.writeFile(path.join(this.sourceDir, filename), body)));
    } catch (error) {
      throw new Error(
        `[WriteParent] An error occurred while proceeding component ${component.fileName} [${component.fileType}]. Original error: ${error}`
      );
    }
  }

  private handleXmlParsingError(error: Error, component: FlosumComponent): void {
    throw new InvalidXmlError(
      `[InvalidXmlError] An error occurred while proceeding XML ${component.fileName} [${component.fileType}]. Original error: ${error}`
    );
  }

  private async writeChild(component: FlosumComponent): Promise<void> {
    const { filename, body } = (await this.readZip(component.body))[0];

    try {
      if (!this.parentComponents[filename]) {
        const parentFilePath = path.join(this.sourceDir, filename);

        if (await FS.exists(parentFilePath)) {
          const parentFile = await FS.readFile(parentFilePath);

          this.parentComponents[filename] = await Xml.parse(parentFile).catch((error) =>
            this.handleXmlParsingError(error, component)
          );
        } else {
          this.parentComponents[filename] = await Xml.parse(body as string).catch((error) =>
            this.handleXmlParsingError(error, component)
          );

          return;
        }
      }

      const parentXml = this.parentComponents[filename];
      const childXml = await Xml.parse(body as string).catch((error) => this.handleXmlParsingError(error, component));

      Xml.replaceOrAppend(parentXml, childXml);
    } catch (error) {
      if (error instanceof InvalidXmlError) {
        if (this.skipChildErrors) {
          return;
        } else {
          throw error;
        }
      }

      throw new Error(
        `[WriteChild] An error occurred while proceeding component ${component.fileName} [${component.fileType}]. Original error: ${error}`
      );
    }
  }

  public async start(): Promise<void> {
    if (!(await FS.exists(this.sourceDir))) {
      await FS.makeDir(this.sourceDir);
    }

    for (const component of this.components) {
      if (!childTypes.includes(component.fileType)) {
        await this.writeParent(component);
      } else {
        await this.writeChild(component);
      }
    }

    const fileNames = Object.keys(this.parentComponents);

    this.internalLogger.log('have to write %d files', this.components.length);

    while (fileNames.length) {
      const fileNamesToWrite = fileNames.splice(0, this.MAX_WRITES_PER_TICK);

      for (const filename of fileNamesToWrite) {
        await FS.writeFile(path.join(this.sourceDir, filename), Xml.convertToString(this.parentComponents[filename]));
      }
    }

    this.parentComponents = {};
  }
}
