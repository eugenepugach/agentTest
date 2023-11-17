export type ParsedComponent = {
  type: string;
  name: string;
  filePath: string;
  files: Record<string, Buffer>;
  crc?: string;
  vlocityComponentName?: string;
  isVlocityComponent?: boolean;
};
