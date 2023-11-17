import { AxiosInstance } from 'axios';
import { ComponentDetails } from '@/modules/functions/types/salesforce-request.type';
import { chunkArray } from '@/modules/shared/utils';
import { FLOSUM_NAMESPACE, SALESFORCE_API_VERSION } from '@/constants';
import { extractFieldsFromRecord } from '@/modules/git/salesforce/utils/flosum-naming.utils';
import admZip from 'adm-zip';

const CHUNK_QUERY_SIZE = 500;
export const MAX_ZIP_SIZE = 34603008;

export class ComponentsApi {
  public static async fetchComponentsDetailsByComponentsHistory(
    request: AxiosInstance,
    attachmentsIds: string[]
  ): Promise<ComponentDetails[]> {
    const componentDetails: ComponentDetails[] = [];
    const chunksComponentsId = chunkArray<string>(attachmentsIds, CHUNK_QUERY_SIZE);

    for (const chunkComponentsId of chunksComponentsId) {
      const query = `
      SELECT Id, ${FLOSUM_NAMESPACE}Component__r.${FLOSUM_NAMESPACE}Component_Name__c, ${FLOSUM_NAMESPACE}Component__r.${FLOSUM_NAMESPACE}Component_Type__c
      FROM ${FLOSUM_NAMESPACE}Component_History__c
      WHERE Id IN (${"'" + chunkComponentsId.join("','") + "'"})`;

      const { data } = await request.get(`/services/data/${SALESFORCE_API_VERSION}/query/`, {
        params: {
          q: query,
        },
      });

      componentDetails.push(...data.records);
    }

    return componentDetails;
  }

  public static removeNamespacePrefix(componentsDetails: ComponentDetails[]): ComponentDetails[] {
    const extractFieldsComponentsDetails = componentsDetails.map((componentDetails) => {
      const extractParentFields = extractFieldsFromRecord(componentDetails, ['Id', `Component__r`]);
      extractParentFields['Component__r'] = extractFieldsFromRecord(extractParentFields[`Component__r`], [
        'Component_Name__c',
        'Component_Type__c',
      ]);
      return extractParentFields;
    });

    return extractFieldsComponentsDetails as ComponentDetails[];
  }

  public static async splitZip(firstZip: admZip, zipLength: number): Promise<admZip[]> {
    const filesName = firstZip
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .sort((firstEntry, secondEntry) => (firstEntry.getData().length > secondEntry.getData().length ? -1 : 1));

    const secondZip = new admZip();

    for (const { entryName } of filesName) {
      const fileContent = firstZip.getEntry(entryName)?.getData() as Buffer;
      secondZip.addFile(entryName, fileContent);
      firstZip.deleteFile(entryName);

      if (zipLength - secondZip.toBuffer().toString('base64').length < MAX_ZIP_SIZE) {
        break;
      }
    }

    return [firstZip, secondZip];
  }
}
