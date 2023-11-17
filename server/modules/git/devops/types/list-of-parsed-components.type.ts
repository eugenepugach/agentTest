import { ParsedComponent } from '../../parsers/types/parsed-component.type';
import { ComponentMetadata } from '../../salesforce/types/component-metadata.type';

export type ListOfParsedComponents = {
  inserted: ParsedComponent[];
  modified: { component: ParsedComponent; meta: ComponentMetadata }[];
  removed: Pick<ComponentMetadata, 'id' | 'name' | 'type'>[];
};
