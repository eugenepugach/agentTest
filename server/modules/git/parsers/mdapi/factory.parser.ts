import { BaseParser } from '@/modules/git/parsers/mdapi/base.parser';
import { MDApiParserV2 } from '@/modules/git/parsers/mdapi/parser-v2';
import { VlocityParser } from '@/modules/git/parsers/mdapi/vlocity-parser';
import { isVlocityComponent } from '@/modules/git/parsers/utils/vlocity';

export class FactoryParser {
  public static create(dir: string, paths: string[]): BaseParser {
    if (isVlocityComponent(paths[0])) {
      return new VlocityParser(dir, paths);
    }

    return new MDApiParserV2(dir, paths);
  }
}
