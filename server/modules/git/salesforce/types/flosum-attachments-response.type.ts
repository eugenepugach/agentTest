import { FlosumComponent } from './flosum-component.type';

export type FlosumAttachmentsResponse = {
  ids: string[];
  components: FlosumComponent[];
  componentsSize: number;
};
