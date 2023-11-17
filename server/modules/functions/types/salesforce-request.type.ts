export type SaveBackupRequestBody = {
  metadataLogId: string;
  backupAsyncId: string;
  instanceUrl: string;
  credentials: FunctionCredentials;
};

export type RetrieveAttachmentRequestBody = {
  metadataLogId: string;
  instanceUrl: string;
  attachmentsId: string[];
  credentials: FunctionCredentials;
};

export type DeployComponentsRequestBody = {
  metadataLogId: string;
  attachmentId: string;
  instanceUrl: string;
  postDestructiveAttachmentId: string;
  credentials: FunctionCredentials;
  deployOptions: DeployOptions;
};

export type GenerateZipBody = {
  metadataLogId: string;
  branchId: string;
  preDestructiveAttachmentId: string;
  postDestructiveAttachmentId: string;
  attachmentsId: string[];
  environments: Record<string, string>;
  metaTypes: string[];
  isExtractComponentsPermissions: boolean;
  instanceUrl: string;
  credentials: FunctionCredentials;
};

export type DeployOptions = {
  allowMissingFiles: boolean;
  autoUpdatePackage: boolean;
  checkOnly: boolean;
  ignoreWarnings: boolean;
  performRetrieve: boolean;
  purgeOnDelete: boolean;
  rollbackOnError: boolean;
  runTests: string[];
  singlePackage: boolean;
  testLevel: string;
};

export type AuthParameters = {
  accessToken?: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
};

export type FunctionCredentials = {
  accessToken: string;
  instanceUrl: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  orgId: string;
  optType?: string;
};

export enum OptionType {
  SAVE_BACKUP_ZIP = 'SAVE_BACKUP_ZIP',
  GET_TESTS = 'GET_TESTS',
  SAVE_DEPLOY_ZIP = 'SAVE_DEPLOY_ZIP',
  DEPLOY = 'DEPLOY',
  ERROR = 'ERROR',
}

export type ComponentDetails = {
  Id: string;
  Component__r: {
    Component_Name__c: string;
    Component_Type__c: string;
  };
};
