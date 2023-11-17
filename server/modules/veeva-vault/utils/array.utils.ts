export class ArrayUtils {
  public static groupToMap<Type>(array: Type[], callbackFn: (entity: Type) => any): Map<any, Type[]> {
    return array.reduce((map, entity) => {
      const value = callbackFn(entity);

      if (!map.has(value)) {
        map.set(value, []);
      }

      map.get(value)?.push(entity);

      return map;
    }, new Map<any, Type[]>());
  }

  public static groupUniqueToMap<Type>(array: Type[], callbackFn: (entity: Type) => any): Map<any, Type> {
    return array.reduce((map, entity) => {
      const value = callbackFn(entity);

      map.set(value, entity);

      return map;
    }, new Map<any, Type>());
  }

  public static group<Type>(array: Type[], callbackFn: (entity: Type) => any): Record<any, Type[]> {
    return array.reduce((groupRecord, entity) => {
      const indexValue = callbackFn(entity);

      if (!groupRecord[indexValue]) {
        groupRecord[indexValue] = [];
      }

      groupRecord[indexValue].push(entity);

      return groupRecord;
    }, {} as Record<any, Type[]>);
  }
}
