import { ParsedComponent } from '../../parsers/types/parsed-component.type';
import { ComponentMetadata } from '../../salesforce/types/component-metadata.type';

export type ParsedCommit = {
  author: string;
  message: string;
  removed: { type: string; name: string; id: string }[]; // removed components id
  modified: { meta: ComponentMetadata; component: ParsedComponent }[];
  inserted: ParsedComponent[];
};
