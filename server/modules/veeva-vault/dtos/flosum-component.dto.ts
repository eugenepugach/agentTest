import { FLOSUM_NAMESPACE } from '@/constants';

export class FlosumComponentDto {
  public id: string;
  public componentType: string;
  public componentName: string;
  public componentHistoryId: string;

  constructor(component: Record<string, any>) {
    this.id = component[`Id`];
    this.componentType = component[`${FLOSUM_NAMESPACE}Component_Type__c`];
    this.componentName = component[`${FLOSUM_NAMESPACE}Component_Name__c`];

    const { [`${FLOSUM_NAMESPACE}Components__r`]: historyComponents } = component;
    this.componentHistoryId = historyComponents?.records.at(0).Id || null;
  }
}
