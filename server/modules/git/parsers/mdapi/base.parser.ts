import { ParsedComponent } from '@/modules/git/parsers/types/parsed-component.type';
import { Logger } from '@/core';

export abstract class BaseParser {
  protected readonly logger;

  constructor(loggerName: string, protected dir: string, protected paths: string[]) {
    this.logger = new Logger(loggerName);
  }

  public abstract parse(): Promise<ParsedComponent[]>;
}
