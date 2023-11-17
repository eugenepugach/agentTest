import { FLOSUM_NAMESPACE } from '../../../../constants';

export class FlosumComponentHistoryDto {
  public id: string;
  public filename: string;

  public static fromSalesforce(record: Record<string, any>): FlosumComponentHistoryDto {
    const dto = new FlosumComponentHistoryDto();

    dto.id = record.Id;
    dto.filename = record[`${FLOSUM_NAMESPACE}Component__r`][`${FLOSUM_NAMESPACE}Component_Name__c`];

    return dto;
  }
}
