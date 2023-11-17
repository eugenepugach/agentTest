import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaComponentDto } from '@/modules/veeva-vault/dtos/veeva-component.dto';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import JSZip from 'jszip';
import { AxiosResponse } from 'axios';
import { VeevaResponseStatus } from '@/modules/veeva-vault/enums/status.enums';
import { VeevaError } from '@/modules/veeva-vault/classes/errors/veeva-error';
import { AxiosInstance } from 'axios';
import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';

export type PackageExportServiceOptions = {
  veevaService: VeevaService;
  connection: AxiosInstance;
  logger: BaseLogger;
};

export class PackageExportService {
  private readonly _veevaService: PackageExportServiceOptions['veevaService'];
  private readonly _connection: PackageExportServiceOptions['connection'];
  private readonly _logger: PackageExportServiceOptions['logger'];

  constructor({ veevaService, connection, logger }: PackageExportServiceOptions) {
    this._veevaService = veevaService;
    this._connection = connection;
    this._logger = logger;
  }

  private async createOutboundPackages(countOfPackage: number, packageName: string): Promise<string[]> {
    this._logger.log('Creating outbound packages');
    const endpoint = VeevaConstants.ENDPOINT_CREATE_RECORDS + 'outbound_package__v';

    const packageList: Record<string, any>[] = new Array(countOfPackage).fill({
      summary__v: packageName,
      'object_type__v.api__name__v': 'migration__sys',
    });

    return await this._veevaService.createVeevaObjectRecords(endpoint, packageList);
  }

  private async createPackageComponents(
    veevaComponentDtoList: VeevaComponentDto[],
    outboundPackageIdList: string[]
  ): Promise<string[]> {
    this._logger.log('Adding components to outbound package');
    const endpoint = VeevaConstants.ENDPOINT_CREATE_RECORDS + 'package_component__v';

    const recordList = veevaComponentDtoList.map((item, i) => ({
      vault_component__v: item.id,
      outbound_package__v: outboundPackageIdList[Math.ceil((i + 1) / VeevaConstants.MAXIMUM_SIZE_OF_PACKAGE) - 1],
    }));
    return await this._veevaService.createVeevaObjectRecords(endpoint, recordList);
  }

  private async getPackageNames(outboundPackageIdList: string[]): Promise<Map<string, string>> {
    this._logger.log('Getting names of outbound packages');
    const query = `
        SELECT 
            id, 
            name__v 
        FROM outbound_package__v 
        WHERE id CONTAINS ('${outboundPackageIdList.join(`','`)}')`;
    const endpoint = VeevaConstants.ENDPOINT_VQL + query;

    const records = await this._veevaService.executeVQL(endpoint);

    return records.reduce((map: Map<string, string>, item) => map.set(item.id, item.name__v), new Map());
  }

  private async createExportOutboundPackages(outboundPackageNameList: string[]): Promise<string[]> {
    this._logger.log('Create Export outbound packages.');
    const endpointList: string[] = [];
    const promiseArray: Promise<AxiosResponse>[] = outboundPackageNameList.map((packageName) => {
      return this._connection.post(
        VeevaConstants.ENDPOINT_EXPORT_IMPORT_PACKAGE,
        `${encodeURI('packageName')}=${encodeURI(packageName)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    const resultArray = await Promise.all(promiseArray);

    for (const { data } of resultArray) {
      if (data.responseStatus === VeevaResponseStatus.SUCCESS) {
        const { url } = data;
        endpointList.push(url);
      } else {
        throw new VeevaError(data.errors);
      }
    }

    return endpointList;
  }

  private async getEndpointArtifactList(endpointList: string[]): Promise<string[]> {
    this._logger.log('Retrieve Jobs Status');
    const endpointArtifactList: string[] = [];

    const jobResultList = await this._veevaService.getJobResult(endpointList);

    for (const jobResult of jobResultList) {
      const hrefList = jobResult.links
        .filter((link: Record<string, any>) => link.rel === 'artifacts')
        .map((link: Record<string, any>) => link.href);
      endpointArtifactList.push(...hrefList);
    }

    return endpointArtifactList;
  }

  private async retrieveVPKList(endpointList: string[]): Promise<JSZip[]> {
    const zipList: JSZip[] = [];
    this._logger.log('Retrieve Outbound Package zip list');
    for (const endpoint of endpointList) {
      const { data, headers } = await this._connection.get(endpoint, {
        responseType: 'arraybuffer',
      });
      const isJSON = headers['content-type']?.includes('application/json');
      if (!isJSON) {
        const buffer = data;
        const zip = new JSZip();
        await zip.loadAsync(buffer);
        zipList.push(zip);
      } else {
        const responseObj = JSON.parse(data);
        throw new VeevaError(responseObj.errors);
      }
    }

    return zipList;
  }

  private async deletePackageComponents(packageComponentIdList: string[]): Promise<void> {
    this._logger.log('Removing components from outbound packages.');
    const endpoint = VeevaConstants.ENDPOINT_CREATE_RECORDS + 'package_component__v';

    await this._veevaService.deleteVeevaObjectRecords(endpoint, packageComponentIdList);
  }

  private async deleteOutboundPackages(outboundPackageIdList: string[]): Promise<void> {
    this._logger.log('Deleting outbound packages.');
    const endpoint = VeevaConstants.ENDPOINT_CREATE_RECORDS + 'outbound_package__v';

    await this._veevaService.deleteVeevaObjectRecords(endpoint, outboundPackageIdList);
  }

  public async export(veevaComponentDtoList: VeevaComponentDto[], packageName: string): Promise<JSZip[]> {
    const outboundPackageIdList = await this.createOutboundPackages(
      Math.ceil(veevaComponentDtoList.length / VeevaConstants.MAXIMUM_SIZE_OF_PACKAGE),
      packageName
    );

    const packageComponentIdList = await this.createPackageComponents(veevaComponentDtoList, outboundPackageIdList);
    const idToPackageNameMap = await this.getPackageNames(outboundPackageIdList);
    const endpointList = await this.createExportOutboundPackages(Array.from(idToPackageNameMap.values()));
    const endpointArtifactList = await this.getEndpointArtifactList(endpointList);

    const vpkList = await this.retrieveVPKList(endpointArtifactList);

    await this.deletePackageComponents(packageComponentIdList);
    await this.deleteOutboundPackages(outboundPackageIdList);

    return vpkList;
  }
}
