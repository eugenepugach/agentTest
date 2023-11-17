export enum AppResponseStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum VeevaResponseStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum MetadataLogStatus {
  EXCEPTION = 'Exception',
  COMPLETED = 'Completed',
}

export enum PackageComponentStatus {
  ERROR = 'ERROR',
  DEPLOYED = 'DEPLOYED',
  VERIFIED = 'VERIFIED',
}

export enum VeevaPackageStatus {
  VERIFIED = 'verified__v',
  DEPLOYED = 'deployed__v',
  DEPLOYED_WITH_WARNINGS = 'deployed_with_warning__v',
}

export enum VeevaDeploymentStatus {
  ERROR = 'error__v',
  DEPLOYED = 'deployed__v',
  DEPLOYED_WITH_WARNING = 'deployed_with_warning__v',
  VERIFIED = 'verified__v',
}

export enum VeevaJobStatus {
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERRORS_ENCOUNTERED = 'ERRORS_ENCOUNTERED',
  QUEUEING = 'QUEUEING',
  CANCELLED = 'CANCELLED',
  MISSED_SCHEDULE = 'MISSED_SCHEDULE',
}

export enum PackageDeploymentAction {
  DELETED = 'DELETED',
  NO_CHANGE = 'NO CHANGE',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
}
