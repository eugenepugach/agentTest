export interface X2JSOptions {
  useDoubleQuotes: boolean;
  escapeMode: boolean;
  stripWhitespaces: boolean;
}

export class X2JS {
  constructor(options: X2JSOptions);

  public xml_str2json(xmlString: string): Record<string, any>;

  public json2xml_str(json: Record<string, any>): string;
}
