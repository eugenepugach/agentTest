export class VeevaComponentRelationshipDto {
  public id: string;
  public sourceComponentId: string;
  public targetComponentId: string;
  public targetComponentName: string;
  public createdDate: string;

  constructor(veevaComponentRelationship: Record<string, any>) {
    this.id = veevaComponentRelationship.id;
    this.sourceComponentId = veevaComponentRelationship.source_component__sys;
    this.targetComponentId = veevaComponentRelationship.target_component__sys;
    this.targetComponentName = veevaComponentRelationship.target_component_name__sys;
    this.createdDate = veevaComponentRelationship.created_date__v;
  }
}
