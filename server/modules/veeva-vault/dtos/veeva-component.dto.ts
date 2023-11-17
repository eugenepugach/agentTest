export class VeevaComponentDto {
  public id: string;
  public lastModifiedDate: string;
  public name: string;
  public type: string;
  public status: string[];

  constructor(veevaComponent: Record<string, any>) {
    this.id = veevaComponent.id;
    this.lastModifiedDate = veevaComponent.component_modified_date__sys;
    this.name = veevaComponent.component_name__v;
    this.type = veevaComponent.component_type__v;
    this.status = veevaComponent.status__v;
  }
}
