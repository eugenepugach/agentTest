import { BaseParser } from '@/modules/git/parsers/mdapi/base.parser';
import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';
import { FS } from '@/modules/git/internal/fs.internal';
import { calculateCRC32 } from '@/modules/git/parsers/utils/crc32';
import { join as joinPaths, relative, sep } from 'path';

export class VlocityParser extends BaseParser {
  private readonly VLOCITY_DATA_PACK_EXTENSION = '_DataPack.json';

  constructor(dir: string, paths: string[]) {
    super(VlocityParser.name, dir, paths);
  }

  private async readComponent(path: string): Promise<Record<string, Buffer>> {
    const bundleDir = joinPaths(this.dir, path);

    const files = await FS.readDir(bundleDir, true);

    const result: Record<string, Buffer> = {};

    for (const file of files) {
      result[relative(this.dir, file).replace(/\\/g, '/')] = await FS.readFile(file, true);
    }

    return result;
  }

  private extractFileNameFromFiles({ files }: Pick<ParsedComponent, 'files'>): string {
    const dataPackEntry = Object.entries(files).find(([key]) => key.endsWith(this.VLOCITY_DATA_PACK_EXTENSION));

    if (!dataPackEntry) {
      throw new Error('Can not find DataPack file in Vlocity component.');
    }

    const dataPack = JSON.parse(dataPackEntry[1].toString());

    return dataPack.Name;
  }

  public async parse(): Promise<ParsedComponent[]> {
    const path = this.paths[0];

    const [componentType, componentName] = path.split(sep);

    let files;
    try {
      files = await this.readComponent(path);
    } catch (error) {
      this.logger.error('error occurred when parsing file/folder %s. Original error: ', path, error);
      return [];
    }

    const vlocityComponentName = this.extractFileNameFromFiles({ files });

    const component: ParsedComponent = {
      files,
      vlocityComponentName,
      filePath: path,
      type: componentType,
      name: componentName,
      crc: '',
      isVlocityComponent: true,
    };

    const crc = calculateCRC32(component);
    component.crc = crc;

    return [component];
  }
}
