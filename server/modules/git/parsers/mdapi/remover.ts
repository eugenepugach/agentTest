import { AnyType } from '@/core/types/any.type';
import { DeletedComponent } from '../../salesforce/types/deleted-component.type';
import { FS } from '../../internal/fs.internal';
import { Logger } from '@/core';
import { XmlV2 as Xml } from '../utils/xml-v2';
import childTypes from '../data/child-types';
import childTypesMap from '../data/child-types-map';
import path from 'path';

export class MDApiRemover {
  private readonly META_EXTENSION = '-meta.xml';
  private readonly META_EXPERIENCE_BUNDLE = 'site-meta.xml';
  private MAX_WRITES_PER_TICK = 100;
  private logger = new Logger(MDApiRemover.name);

  private parentComponents: Record<string, AnyType> = {};

  constructor(private components: DeletedComponent[], public sourceDir: string) {}

  private async removeParent(component: DeletedComponent): Promise<void> {
    const filePath = path.join(this.sourceDir, component.path);
    const metaPath = path.join(this.sourceDir, `${component.path}${this.META_EXTENSION}`);

    if (this.parentComponents[component.path]) {
      delete this.parentComponents[component.path];
    }

    const isDir = await FS.isDir(filePath).catch(() => false);

    if (isDir) {
      this.logger.log('remove component directory %s [%s]', filePath, component.type);
      await FS.removeDir(filePath);

      if (component.type === 'ExperienceBundle') {
        await FS.removeFile(`${filePath}${this.META_EXPERIENCE_BUNDLE}`).catch(() => void 0);
      } else {
        this.logger.log('remove component directory %s [%s] meta file', filePath, component.type);
        await FS.removeFile(`${filePath}${this.META_EXTENSION}`).catch(() => void 0);
      }

      return;
    }

    this.logger.log('remove component  %s [%s]', filePath, component.type);
    await Promise.all([FS.removeFile(filePath), FS.removeFile(metaPath)]);
  }

  private async removeChild(component: DeletedComponent): Promise<void> {
    const { fileName, type, path: filepath } = component;

    const childField = childTypesMap[type];

    if (!childField) {
      throw new Error(`Unknown child type ${type}`);
    }

    if (!this.parentComponents[filepath]) {
      const parentFilePath = path.join(this.sourceDir, filepath);

      const isFileExists = await FS.exists(parentFilePath);

      if (!isFileExists) {
        return;
      }

      const parentFile = await FS.readFile(parentFilePath);

      this.parentComponents[filepath] = await Xml.parse(parentFile);
    }

    const parentXml = this.parentComponents[filepath];

    const componentName = fileName.split('.').pop();

    Xml.removeAt(parentXml, childField, componentName || fileName);

    if (Xml.isEmptyXml(parentXml)) {
      this.logger.log('remove empty parent component file %s [%s]', component.path, component.fileName);

      await this.removeParent(component);
      delete this.parentComponents[filepath];
    } else {
      this.parentComponents[filepath] = parentXml;
    }
  }

  public async start(): Promise<void> {
    if (!(await FS.exists(this.sourceDir))) {
      await FS.makeDir(this.sourceDir);
    }

    for (const component of this.components) {
      if (!childTypes.includes(component.type)) {
        this.logger.log('remove parent component %s [%s]', component.fileName, component.type);

        await this.removeParent(component);
      } else {
        this.logger.log('remove child component %s [%s]', component.fileName, component.type);

        await this.removeChild(component);
      }
    }

    const fileNames = Object.keys(this.parentComponents);

    this.logger.log('have to update %d files', this.components.length);

    while (fileNames.length) {
      const fileNamesToWrite = fileNames.splice(0, this.MAX_WRITES_PER_TICK);

      for (const filename of fileNamesToWrite) {
        await FS.writeFile(path.join(this.sourceDir, filename), Xml.convertToString(this.parentComponents[filename]));
      }
    }

    this.parentComponents = {};
  }
}
