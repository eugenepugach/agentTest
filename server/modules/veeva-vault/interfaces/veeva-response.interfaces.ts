import {
  VeevaDeploymentStatus,
  VeevaPackageStatus,
  VeevaResponseStatus,
} from '@/modules/veeva-vault/enums/status.enums';
import { VeevaErrorDetails } from '@/modules/veeva-vault/interfaces/errors.interfaces';

export interface ErrorVeevaResponse {
  responseStatus: VeevaResponseStatus.FAILURE;
  errors: VeevaErrorDetails[];
}

export interface SuccessVeevaResponse {
  responseStatus: VeevaResponseStatus.SUCCESS;
}

export interface VeevaImportDetails extends SuccessVeevaResponse {
  vaultPackage: VaultPackage;
}

export interface VeevaValidationDetails extends SuccessVeevaResponse {
  responseDetails: VeevaValidationDetailsResponseDetails;
}

export interface VeevaValidationDetailsResponseDetails extends SuccessVeevaResponse {
  package_steps: VeevaValidationPackageStep[];
}

export interface VeevaDeployDetails extends SuccessVeevaResponse {
  responseDetails: VeevaDeployDetailsResponseDetails;
  package_steps: VeevaPackageStep[];
}

export interface VeevaDeployDetailsResponseDetails extends SuccessVeevaResponse {
  deployment_log: VeevaLog[];
  package_status__v: VeevaPackageStatus;
}

export interface VaultPackage {
  log: VeevaLog[];
  id: string;
  package_status: VeevaPackageStatus;
  package_steps: VeevaPackageStep[];
}

export interface VeevaLog {
  filename: string;
  url: string;
}

export interface VeevaValidationPackageStep {
  name__v: string;
  deployment_status__v: VeevaDeploymentStatus;
  deployment_action: string;
}

export interface VeevaPackageStep {
  name__v: string;
  deployment_status__v: VeevaDeploymentStatus;
  package_components: VeevaPackageComponent[];
}

export interface VeevaPackageComponent {
  component_name__v: string;
  component_type__v: string;
}
