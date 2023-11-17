import { Input, Options as StringifyOptions, stringify as csvStringify } from 'csv-stringify';
import { Options as ParseOptions, parse as csvParse } from 'csv-parse';

export default class CsvUtils {
  public static async stringify(input: Input, options: StringifyOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      csvStringify(input, options, (error, output) => {
        if (error) {
          reject(error);
        } else {
          resolve(output);
        }
      });
    });
  }

  public static async parse(input: string, options: ParseOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      csvParse(input, options, (error, output) => {
        if (error) {
          reject(error);
        } else {
          resolve(output);
        }
      });
    });
  }
}
