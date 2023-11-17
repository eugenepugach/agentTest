import { Transform, TransformCallback } from 'stream';
import { FieldRule } from '@data-masking-job/interfaces/job.interfaces';
import { DescribeField } from '@flosum/salesforce';
import { DescribeField as DescribeFieldDataMasking } from '@flosum/data-masking';
import { MaskingFactory } from '@flosum/data-masking';

export type StandardMaskingOptions = {
  fieldRules: Record<string, FieldRule>;
  objectName: string;
  describeFieldMap: Map<string, DescribeField>;
  libraries?: Record<string, string[] | number[]>;
};

export class StandardMasking extends Transform {
  private readonly _fieldRules: Record<string, FieldRule>;
  private readonly _objectName: string;
  private readonly _describeFieldMap: Map<string, DescribeField>;
  private readonly _libraries?: Record<string, string[] | number[]>;

  constructor({ fieldRules, objectName, describeFieldMap, libraries }: StandardMaskingOptions) {
    super({ objectMode: true });
    this._fieldRules = fieldRules;
    this._objectName = objectName;
    this._describeFieldMap = describeFieldMap;
    this._libraries = libraries;
  }

  _transform(record: Record<string, any> | null, _encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      if (!record) {
        callback(null, null);
        return;
      }

      const maskedRecord = this.maskRecord(record);
      maskedRecord.Id = record.Id;

      callback(null, maskedRecord);
    } catch (error) {
      callback(error, null);
    }
  }

  private maskRecord(record: Record<string, any>): Record<string, any> {
    return Object.keys(this._fieldRules).reduce((maskedRecord, fieldName) => {
      const currentValue = record[fieldName];

      const fieldDescribe = this._describeFieldMap.get(fieldName);

      if (!fieldDescribe) {
        throw new Error(`Cannot find Describe Field for '${fieldName}' field`);
      }

      maskedRecord[fieldName] = MaskingFactory.create({
        ...this._fieldRules[fieldName],
        library: this._libraries,
        describeField: fieldDescribe as unknown as DescribeFieldDataMasking,
      }).execute(currentValue);

      return maskedRecord;
    }, {} as Record<string, any>);
  }
}
