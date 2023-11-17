import { VeevaConstants } from '@/modules/veeva-vault/constants/veeva.constants';
import { VeevaService } from '@/modules/veeva-vault/services/veeva.service';
import { AxiosInstance } from 'axios';
import {
  PackageComponentStatus,
  VeevaPackageStatus,
  VeevaResponseStatus,
} from '@/modules/veeva-vault/enums/status.enums';
import { VeevaError } from '@/modules/veeva-vault/classes/errors/veeva-error';
import { BaseLogger } from '@/modules/veeva-vault/interfaces/base.logger.interface';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { updateVeevaConnection } from '@/modules/veeva-vault/utils/veeva-auth.utils';
import { PackageDetailsDto } from '@/modules/veeva-vault/dtos/package-details.dto';
import {
  ErrorVeevaResponse,
  VeevaDeployDetails,
  VeevaPackageStep,
  VeevaImportDetails,
  VeevaValidationDetails,
} from '@/modules/veeva-vault/interfaces/veeva-response.interfaces';
import { PackageComponentDto } from '@/modules/veeva-vault/dtos/package-component.dto';
import { ArrayUtils } from '@/modules/veeva-vault/utils/array.utils';

export type PackageImportServiceOptions = {
  veevaService: VeevaService;
  connection: AxiosInstance;
  logger: BaseLogger;
  saveLog(logData: string, name: string): Promise<void>;
};

export class PackageImportService {
  private readonly _veevaService: PackageImportServiceOptions['veevaService'];
  private readonly _connection: PackageImportServiceOptions['connection'];
  private readonly _logger: PackageImportServiceOptions['logger'];
  private readonly _saveLog: PackageImportServiceOptions['saveLog'];

  constructor({ veevaService, connection, logger, saveLog }: PackageImportServiceOptions) {
    this._veevaService = veevaService;
    this._connection = connection;
    this._logger = logger;
    this._saveLog = saveLog;
  }

  private async importVpk(vpkPath: string, retries = 1): Promise<string> {
    this._logger.log('Import package');
    const form = new FormData();
    form.append('file', createReadStream(vpkPath));

    const response = await this._connection.put(VeevaConstants.ENDPOINT_EXPORT_IMPORT_PACKAGE, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const responseObject = response.data;
    if (responseObject.responseStatus === VeevaResponseStatus.SUCCESS) {
      return responseObject.url;
    } else {
      if (retries > 0) {
        await updateVeevaConnection(this._connection);
        return await this.importVpk(vpkPath, retries - 1);
      }
      throw new VeevaError(responseObject.errors);
    }
  }

  private async deployPackage(packageId: string): Promise<string> {
    this._logger.log('Deploy package');
    const response = await this._connection.post(
      VeevaConstants.ENDPOINT_DEPLOY_PACKAGE.replace('{package_id}', packageId)
    );

    const responseObject = await response.data;
    if (responseObject.responseStatus === VeevaResponseStatus.SUCCESS) {
      return responseObject.url;
    } else {
      throw new VeevaError(responseObject.errors);
    }
  }

  private async getJobDetailUrl(jobEndpoint: string): Promise<string> {
    this._logger.log('Wait Executing job');
    const [jobResult] = await this._veevaService.getJobResult([jobEndpoint]);

    return jobResult.links.find((link: Record<string, any>) => link.rel === 'artifacts').href;
  }

  private async getValidationDetailsAndSaveLog(detailUrl: string): Promise<PackageDetailsDto> {
    this._logger.log('Get validation details.');

    const { data } = await this._connection.get<VeevaImportDetails | ErrorVeevaResponse>(detailUrl);

    if (data.responseStatus === VeevaResponseStatus.SUCCESS) {
      const packageDetailsDto = new PackageDetailsDto();

      const { log, id, package_status: status, package_steps: packageSteps } = data.vaultPackage;

      const validateLogArray = log.filter((oneLog) => oneLog.filename.endsWith('Validation.log'));
      const logData = await this.getLogResultText(validateLogArray[0].url);
      await this._saveLog(logData, 'Validation Log');

      packageDetailsDto.packageId = id;
      packageDetailsDto.packageComponentList = this.formPackageComponentList(packageSteps);

      await this.fillPackageDeploymentAction(packageDetailsDto);

      if (status !== VeevaPackageStatus.VERIFIED) {
        throw new Error('Package not verified');
      }

      return packageDetailsDto;
    } else {
      throw new VeevaError(data.errors);
    }
  }

  private async getDeployDetailsAndSaveLog(
    detailUrl: string,
    packageDetailsDto: PackageDetailsDto
  ): Promise<PackageDetailsDto> {
    this._logger.log('Get deploy result');

    const { data } = await this._connection.get<VeevaDeployDetails | ErrorVeevaResponse>(detailUrl);

    if (data.responseStatus === VeevaResponseStatus.SUCCESS) {
      const {
        responseDetails: { deployment_log: log, package_status__v: status },
        package_steps: packageSteps,
      } = data;

      const deployLogArray = log.filter((oneLog: Record<string, any>) => oneLog.filename.endsWith('Deployment.log'));
      const logData = await this.getLogResultText(deployLogArray[0].url);
      await this._saveLog(logData, 'Deploy Log');

      packageDetailsDto.isDeployed = [VeevaPackageStatus.DEPLOYED, VeevaPackageStatus.DEPLOYED_WITH_WARNINGS].includes(
        status
      );

      const packageComponentByUniqueName = ArrayUtils.groupUniqueToMap(
        this.formPackageComponentList(packageSteps),
        ({ uniqueName }) => uniqueName
      );

      for (const packageComponent of packageDetailsDto.packageComponentList) {
        const newStatus = packageComponentByUniqueName.get(packageComponent.uniqueName)?.status;

        if (newStatus) {
          packageComponent.status = newStatus;
        }
      }

      packageDetailsDto.packageComponentList = packageDetailsDto.packageComponentList.filter(
        (item) => item.status !== PackageComponentStatus.VERIFIED
      );

      if (!packageDetailsDto.packageComponentList.length) {
        throw new Error('Cannot find deployment results');
      }

      return packageDetailsDto;
    } else {
      throw new VeevaError(data.errors);
    }
  }

  private async getLogResultText(url: string): Promise<string> {
    const { data } = await this._connection.get(url, {
      responseType: 'text',
    });
    return data;
  }

  private formPackageComponentList(packageSteps: VeevaPackageStep[]): PackageComponentDto[] {
    return packageSteps.reduce((componentList: PackageComponentDto[], currentStep) => {
      const newComponentList = currentStep.package_components.map(
        (component) =>
          new PackageComponentDto({
            status: currentStep.deployment_status__v,
            stepName: currentStep.name__v,
            component,
          })
      );
      return [...componentList, ...newComponentList];
    }, []);
  }

  private async fillPackageDeploymentAction(packageDetailsDto: PackageDetailsDto): Promise<void> {
    const { data } = await this._connection.post<VeevaValidationDetails | ErrorVeevaResponse>(
      VeevaConstants.ENDPOINT_VALIDATE_PACKAGE.replace(`{package_id}`, packageDetailsDto.packageId)
    );

    if (data.responseStatus === VeevaResponseStatus.SUCCESS) {
      const { package_steps: packageSteps } = data.responseDetails;

      const packageComponentByStepName = ArrayUtils.groupToMap(
        packageDetailsDto.packageComponentList,
        ({ stepName }) => stepName
      );

      for (const { name__v, deployment_action } of packageSteps) {
        for (const packageComponentDto of packageComponentByStepName.get(name__v) || []) {
          packageComponentDto.deploymentAction = PackageComponentDto.convertDeploymentAction(deployment_action);
        }
      }
    } else {
      throw new VeevaError(data.errors);
    }
  }

  public async import(vpkPath: string): Promise<PackageDetailsDto> {
    const jobValidateEndpoint = await this.importVpk(vpkPath);

    const validateJobDetailUrl = await this.getJobDetailUrl(jobValidateEndpoint);
    const packageDetailsDto = await this.getValidationDetailsAndSaveLog(validateJobDetailUrl);

    const jobDeployEndpoint = await this.deployPackage(packageDetailsDto.packageId);
    const deployJobDetailUrl = await this.getJobDetailUrl(jobDeployEndpoint);
    return this.getDeployDetailsAndSaveLog(deployJobDetailUrl, packageDetailsDto);
  }
}
