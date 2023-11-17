import { FS } from '@/modules/git/internal/fs.internal';
import { ParsedComponent } from '../types/parsed-component.type';
import {
  convertToCleanPaths,
  createChildComponentsFromParent,
  extractFileNameFromFiles,
  extractComponentTypeFromFiles,
  extractFilenameFromPath,
  isParentComponent,
} from '../utils';
import { extname, join as joinPaths, relative } from 'path';
import { Xml } from '../utils/xml';
import childTypesMap from '../data/child-types-map';
import { BUNDLED_FOLDERS_REGEXP } from '@/constants';
import { Logger } from '@/core';
import { isPathsEquals } from '@/modules/git/devops/utils/git-commit.utils';
import { calculateCRC32 } from '@/modules/git/parsers/utils/crc32';
import FolderTypes from '@/modules/git/parsers/data/folder-types';
import settingsTypesList from '@/modules/git/parsers/data/settings-types-list';

const CHILD_XML_KEYS = Object.values(childTypesMap);

export class MDApiParser {
  private readonly logger = new Logger(MDApiParser.name);
  private readonly META_EXTENSION = '-meta.xml';
  private readonly META_EXPERIENCES_EXTENSION = '.site-meta.xml';
  private paths: string[];

  constructor(private dir: string, paths: string[], private isSFDXProject: boolean) {
    this.paths = paths;
  }

  private async readChildComponents(component: ParsedComponent): Promise<ParsedComponent[]> {
    try {
      const xml = await Xml.parse(Object.values(component.files)[0].toString('utf-8'));

      const childs = CHILD_XML_KEYS.filter((childNodeName) => Xml.hasChildNodes(xml, childNodeName)).reduce(
        (acc, xmlType) => [...acc, ...Xml.getChildsByName(xml, xmlType)],
        [] as {
          nodeName: string;
          nodeData: any;
        }[]
      );

      return createChildComponentsFromParent(component, xml, childs);
    } catch (error) {
      throw new Error(`Cannot parse childs in ${component.name} [${component.type}]`);
    }
  }

  private async readBundledFiles(path: string): Promise<Record<string, Buffer>> {
    const bundleDir = joinPaths(this.dir, path);
    const metaFilePath =
      path + (path.startsWith('experiences') ? this.META_EXPERIENCES_EXTENSION : this.META_EXTENSION);
    // read all files in directory
    const files = await FS.readDir(bundleDir, true);
    const metaFile = await FS.readFile(joinPaths(this.dir, metaFilePath), true).catch(() => null);

    const result: Record<string, Buffer> = {};

    for (const file of files) {
      result[relative(this.dir, file)] = await FS.readFile(file, true);
    }

    if (metaFile) {
      result[relative(this.dir, metaFilePath)] = metaFile;
    }

    return result;
  }

  private async readComponentFiles(path: string): Promise<Record<string, Buffer>> {
    let metaFilePath = path + this.META_EXTENSION;

    if (BUNDLED_FOLDERS_REGEXP.test(path)) {
      return this.readBundledFiles(path);
    }

    // Fix for *Folder types to be parsed without folder
    if ((await FS.isDir(joinPaths(this.dir, path))) || (await FS.exists(joinPaths(this.dir, metaFilePath)))) {
      const metaFile = await FS.readFile(joinPaths(this.dir, metaFilePath), true);

      const componentType = await extractComponentTypeFromFiles({ files: { [metaFilePath]: metaFile } }).catch(
        () => null
      );

      if (componentType && FolderTypes.includes(componentType)) {
        return {
          [metaFilePath]: await FS.readFile(joinPaths(this.dir, metaFilePath), true),
        };
      }
    }

    if (!extname(path) && this.isSFDXProject) {
      const pathDir = path.split('/')[0];
      const foundedPath = (await FS.readDir(joinPaths(this.dir, pathDir))).find((existedPath) =>
        isPathsEquals(existedPath, joinPaths(this.dir, path))
      );

      if (!foundedPath) {
        throw new Error(`Component "${path}" not found in "${pathDir}"`);
      }

      path = relative(this.dir, foundedPath);
      metaFilePath = path + this.META_EXTENSION;
    }

    const [file, metaFile] = await Promise.all([
      FS.readFile(joinPaths(this.dir, path), true).catch(() => null),
      FS.readFile(joinPaths(this.dir, metaFilePath), true).catch(() => null),
    ]);

    return {
      ...(file ? { [path]: file } : {}),
      ...(metaFile ? { [metaFilePath]: metaFile } : {}),
    };
  }

  private async init(): Promise<void> {
    const paths = [...this.paths];

    if (this.isSFDXProject) {
      for (const path of paths) {
        if (BUNDLED_FOLDERS_REGEXP.test(path)) {
          continue;
        }
        if (await FS.isDir(joinPaths(this.dir, path))) {
          const dirPaths = await FS.readDir(joinPaths(this.dir, path), true);

          paths.push(...dirPaths.map((filePath) => relative(this.dir, filePath)));
        }
      }
    }

    this.paths = convertToCleanPaths(paths);
  }

  async parse(): Promise<ParsedComponent[]> {
    await this.init();

    const parsedComponents: Partial<ParsedComponent>[] = [];

    for (const path of this.paths) {
      if (path.endsWith('package.xml')) {
        continue;
      }

      const component: Partial<ParsedComponent> = {};

      try {
        component.files = await this.readComponentFiles(path);
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
