import { FLOSUM_NAMESPACE } from '@/constants';

export const TRACKING_METADATA_FOLDER_NAME = '.tracking-metadata';
export const ORG_COMPONENT_OBJECT_NAME = `${FLOSUM_NAMESPACE}Org_Component__c`;
export const METADATA_FOLDER_MAP = new Map<string, string>([
  ['Document', 'DocumentFolder'],
  ['Dashboard', 'DashboardFolder'],
  ['Report', 'ReportFolder'],
  ['EmailTemplate', 'EmailFolder'],
]);
export const BINARY_FIELD_NAME = 'Body';
export const ATTACHMENT_OBJECT_NAME = 'Attachment';
export enum LogStatus {
  COMPLETED = 'Completed',
  IN_PROGRESS = 'In Progress',
  EXCEPTION = 'Exception',
}
