import { FS } from '@/modules/git/internal/fs.internal';
import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';
import {
  createChildComponentsFromParent,
  extractFileNameFromFiles,
  extractComponentTypeFromFiles,
  extractFilenameFromPath,
  isParentComponent,
} from '../utils';
import { join as joinPaths, relative } from 'path';
import { XmlV2 as Xml } from '../utils/xml-v2';
import childTypesMap from '../data/child-types-map';
import { BUNDLED_FOLDERS_REGEXP } from '@/constants';
import { calculateCRC32 } from '@/modules/git/parsers/utils/crc32';
import FolderTypes from '@/modules/git/parsers/data/folder-types';
import settingsTypesList from '@/modules/git/parsers/data/settings-types-list';
import { BaseParser } from '@/modules/git/parsers/mdapi/base.parser';

const CHILD_XML_KEYS = Object.values(childTypesMap);

export class MDApiParserV2 extends BaseParser {
  private readonly META_EXTENSION = '-meta.xml';
  private readonly META_EXPERIENCES_EXTENSION = '.site-meta.xml';

  constructor(dir: string, paths: string[]) {
    super(MDApiParserV2.name, dir, paths);
  }

  private async readChildComponents(component: ParsedComponent): Promise<ParsedComponent[]> {
    try {
      const xml = await Xml.parse(Object.values(component.files)[0].toString('utf-8'));

      const children = CHILD_XML_KEYS.filter((childNodeName) => Xml.hasChildNodes(xml, childNodeName)).reduce(
        (acc, xmlType) => [...acc, ...Xml.getChildsByName(xml, xmlType)],
        [] as {
          nodeName: string;
          nodeData: any;
        }[]
      );

      return createChildComponentsFromParent(component, xml, children);
    } catch (error) {
      throw new Error(`Cannot parse children in ${component.name} [${component.type}]`);
    }
  }

  private async readBundledComponent(path: string): Promise<Record<string, Buffer>> {
    const bundleDir = joinPaths(this.dir, path);
    const metaFilePath =
      path + (path.startsWith('experiences') ? this.META_EXPERIENCES_EXTENSION : this.META_EXTENSION);
    // read all files in directory
    const files = await FS.readDir(bundleDir, true);
    const metaFile = await FS.readFile(joinPaths(this.dir, metaFilePath), true).catch(() => null);

    const result: Record<string, Buffer> = {};

    for (const file of files) {
      result[relative(this.dir, file).replace(/\\/g, '/')] = await FS.readFile(file, true);
    }

    if (metaFile) {
      result[relative(this.dir, metaFilePath).replace(/\\/g, '/')] = metaFile;
    }

    return result;
  }

  private async readComponent(path: string): Promise<Record<string, Buffer>> {
    const metaFile = path + this.META_EXTENSION;

    if (BUNDLED_FOLDERS_REGEXP.test(path)) {
      return this.readBundledComponent(path);
    }

    // For components that have -meta.xml file
    if (await FS.exists(joinPaths(this.dir, metaFile))) {
      const meta = await FS.readFile(joinPaths(this.dir, metaFile), true);
      const componentType = await extractComponentTypeFromFiles({ files: { [metaFile]: meta } }).catch(() => null);

      if (componentType && FolderTypes.includes(componentType)) {
        return {
          [metaFile]: meta,
        };
      }

      return {
        [metaFile]: meta,
        [path]: await FS.readFile(joinPaths(this.dir, path), true),
      };
    }

    // Single file components such as CustomObjects
    return {
      [path]: await FS.readFile(joinPaths(this.dir, path), true),
    };
  }

  /**
   * Fix for multiple bundled components in paths property
   * ex: ['aura/ComponentName/ComponentName.css', 'aura/ComponentName/ComponentName.html'...]
   * @private
   */
  private foldBundledComponentsPaths(): void {
    this.paths = this.paths.map((path) =>
      BUNDLED_FOLDERS_REGEXP.test(path) ? path.split('/').slice(0, 2).join('/') : path
    );
    this.paths = [...new Set(this.paths)];
  }

  public async parse(): Promise<ParsedComponent[]> {
    const parsedComponents: Partial<ParsedComponent>[] = [];

    this.foldBundledComponentsPaths();

    for (const path of this.paths) {
      if (path.endsWith('package.xml')) {
        continue;
      }

      const component: Partial<ParsedComponent> = {};

      try {
        component.files = await this.readComponent(path);
        component.filePath = BUNDLED_FOLDERS_REGEXP.test(path)
          ? path
          : extractFileNameFromFiles({ files: component.files });

        if (path.startsWith('waveTemplates')) {
          component.type = 'WaveTemplateBundle';
        } else {
          component.type = await extractComponentTypeFromFiles({ files: component.files });
        }
      } catch (error) {
        this.logger.error('error occurred when parsing file/folder %s. Original error: ', path, error);
        continue;
      }

      component.name = extractFilenameFromPath(path);
      component.crc = calculateCRC32(component as ParsedComponent);

      if (isParentComponent(component as ParsedComponent)) {
        const childComponents = await this.readChildComponents(component as ParsedComponent);
        parsedComponents.push(...childComponents);
      }

      if (component.type === 'CustomLabels') {
        continue;
      }

      // Fix settings type converted to {ComponentType}Settings
      if (settingsTypesList.includes(component.type)) {
        component.type = 'Settings';
      }

      parsedComponents.push(component);
    }

    return parsedComponents as ParsedComponent[];
  }
}
