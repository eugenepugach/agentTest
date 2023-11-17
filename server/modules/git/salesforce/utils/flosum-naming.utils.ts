import { FLOSUM_GIT_NAMESPACE, FLOSUM_NAMESPACE } from '@/constants';
import { AnyType } from '@/core/types/any.type';

export function extractFieldsFromRecord<T extends string>(record: AnyType, fields: T[]): Record<T, any> {
  const result: Record<string, any> = {};

  for (const fieldName of fields) {
    const value =
      record[`${FLOSUM_NAMESPACE}${fieldName}`] || record[`${FLOSUM_GIT_NAMESPACE}${fieldName}`] || record[fieldName];

    result[fieldName] = value || null;
  }

  return result;
}
