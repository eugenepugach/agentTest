import path from 'path';
import { VLOCITY_COMPONENT_TYPES } from '@/modules/git/parsers/data/vlocity-types';

export function isVlocityComponent(componentPath: string): boolean {
  return VLOCITY_COMPONENT_TYPES.includes(componentPath.split(path.sep)[0]);
}
