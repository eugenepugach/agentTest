export class VeevaDependencyRecordDto {
  public blockingType: string;
  public sourceComponentName: string;
  public sourceComponentType: string;
  public targetComponentName: string;
  public targetComponentType: string;

  constructor({
    'Blocking Type': blockingType,
    'Source Component Name': sourceComponentName,
    'Source Component Type': sourceComponentType,
    'Target Component Name': targetComponentName,
    'Target Component Type': targetComponentType,
  }: Record<string, any>) {
    this.blockingType = blockingType;
    this.sourceComponentName = sourceComponentName;
    this.sourceComponentType = sourceComponentType;
    this.targetComponentName = targetComponentName;
    this.targetComponentType = targetComponentType;
  }
}
