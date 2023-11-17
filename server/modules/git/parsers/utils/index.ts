import { META_XML_EXTENSION } from '@/constants';
import { AnyType } from '@/core/types/any.type';
import path from 'path';
import childTypesMap from '../data/child-types-map';
import parentXmlTypes from '../data/parent-xml-types';
import { ParsedComponent } from '../types/parsed-component.type';
import { XmlV2 as Xml } from './xml-v2';
import CRC32 from 'crc-32';
import parentXmlTypesMap from '../data/parent-xml-types-map';
import { FS } from '@/modules/git/internal/fs.internal';

/**
 * This function basically converts git changed paths to clean paths witout -meta.xml extension
 * because we anyway parse it when reading path
 * @param paths - paths which should be converted
 */
export function convertToCleanPaths(paths: string[]): string[] {
  const metaPaths = paths.filter((path) => path.endsWith(META_XML_EXTENSION));
  const extractedPathsFromMetaPaths = metaPaths.map((path) => path.replace(new RegExp(`${META_XML_EXTENSION}$`), ''));

  const clearPaths = paths.filter((path) => !metaPaths.includes(path));

  return [...new Set([...clearPaths, ...extractedPathsFromMetaPaths])];
}

export function filterParserPaths(paths: string[]): string[] {
  const files = [...new Set(paths.filter((path) => !path.endsWith(META_XML_EXTENSION)))];
  const metaFiles = paths
    .filter((path) => path.endsWith(META_XML_EXTENSION))
    .filter((path) => !files.includes(path.replace(META_XML_EXTENSION, '')));
  return [...metaFiles, ...files];
}

export function getChildComponentTypeByChildNodeName(nodeName: string): string {
  const childTypeData = Object.entries(childTypesMap).find(([_, value]) => value === nodeName);

  if (!childTypeData) {
    throw new Error(`Unknown child type for ${nodeName}`);
  }

  return childTypeData[0];
}

export function extractFilenameFromPath(filePath: string): string {
  const tokens = filePath.split(path.sep);
  const basename = path.basename(filePath.replace(META_XML_EXTENSION, ''), path.extname(filePath));

  if (tokens.length > 2) {
    return `${tokens[tokens.length - 2]}/${basename}`;
  }

  return basename;
}

export function isParentComponent({ type }: Pick<ParsedComponent, 'type'>): boolean {
  return parentXmlTypes.includes(type);
}

export function isParentComponentFile(filepath: string): boolean {
  const fileFolder = path.parse(filepath);

  return Object.values(parentXmlTypesMap).some((folder) => fileFolder.dir.endsWith(folder));
}

export function calculateCRC32(component: ParsedComponent): string {
  const fileNames = Object.keys(component.files).sort();

  switch (fileNames.length) {
    case 1: {
      const [fileName] = fileNames;
      const file = component.files[fileName];

      return CRC32.str(file.toString('utf-8'), 32).toString();
    }
    case 2: {
      const [fileName, metaFileName] = fileNames;

      const file = component.files[fileName];
      const metaFile = component.files[metaFileName];

      return (
        CRC32.str(file.toString('utf-8'), 32).toString() + ' ' + CRC32.str(metaFile.toString('utf-8'), 32).toString()
      );
    }
    default: {
      let crcCode = 0;

      if (fileNames.length > 0) crcCode = CRC32.str(component.files[fileNames[0]].toString('utf-8'), 32);

      for (let i = 1; i < fileNames.length; i++) {
        const fileCrc = CRC32.str(component.files[fileNames[i]].toString('utf-8'), 32);
        crcCode = Math.round((fileCrc + crcCode) / 2);
      }
      return crcCode.toString();
    }
  }
}

export function createChildComponentsFromParent(
  parent: ParsedComponent,
  parentXml: AnyType,
  childs: {
    nodeName: string;
    nodeData: any;
  }[]
): ParsedComponent[] {
  const result: Partial<ParsedComponent>[] = [];

  for (const child of childs) {
    const childXml = Xml.addChildNode(Xml.createEmptyRootNodeFrom(parentXml), child.nodeName, child.nodeData);

    const component: Partial<ParsedComponent> = {};
    component.filePath = parent.filePath;
    component.type = getChildComponentTypeByChildNodeName(child.nodeName);

    if (parent.type === 'CustomLabels') {
      component.name = child.nodeData.fullName;
    } else {
      component.name = parent.name + '.' + child.nodeData.fullName;
    }

    component.files = {
      [Object.keys(parent.files)[0]]: Buffer.from(Xml.convertToString(childXml, false)),
    };
    component.crc = calculateCRC32(component as ParsedComponent);

    result.push(component);
  }

  return result as ParsedComponent[];
}

export function extractFileNameFromFiles({ files }: Pick<ParsedComponent, 'files'>): string {
  const fileNames = Object.keys(files);

  return fileNames[0]?.replace(META_XML_EXTENSION, '') || '';
}

export async function extractComponentTypeFromFiles({ files }: Pick<ParsedComponent, 'files'>): Promise<string> {
  const fileNames = Object.keys(files);

  const metaFileName = fileNames.find((file) => file.endsWith(META_XML_EXTENSION)) || fileNames[0];

  try {
    const xml = await Xml.parse(files[metaFileName].toString('utf-8'));

    const rootNodeName = Object.keys(xml)[0];

    if (!rootNodeName) {
      throw new Error();
    }

    return rootNodeName;
  } catch (error) {
    throw new Error(
      `Cannot identify component type. At file [${fileNames.indexOf(metaFileName)}] index in (${fileNames.join(', ')})`
    );
  }
}

export async function readFilesByFilename(fileName: string, rootDir: string): Promise<string[]> {
  const dirName = path.dirname(fileName);
  const dirPath = path.join(rootDir, dirName);

  const dirFiles = await FS.readDir(dirPath, true);

  const mdapiPaths = dirFiles.map((filePath) => path.relative(rootDir, filePath));

  const matcherRegexp = new RegExp(`^${fileName}[./-]{1}`);

  return mdapiPaths.filter((filePath) => filePath.match(matcherRegexp));
}
