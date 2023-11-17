import path from 'path';

export const SALESFORCE_API_VERSION_RAW = '52.0';
export const SALESFORCE_API_VERSION = 'v' + SALESFORCE_API_VERSION_RAW;
export const SALESFORCE_MAX_REQUEST_SIZE_BYTES = 50000000;
export const SALESFORCE_MAX_GRAPH_NODES_PER_REQUEST = 500;
export const META_XML_EXTENSION = '-meta.xml';
export const FORCE_APP_DEFAULT_DIR = 'force-app/main/default';

export const DEFAULT_GIT_USER_NAME = 'flosum';
export const DEFAULT_GIT_USER_EMAIL = 'flosum';
export const INITIAL_COMMIT = 'init repository';

export const SYNC_ATTACHMENT_FOR_BRANCH_NAME = 'SyncAttachmentBranch';
export const SYNC_ATTACHMENT_FOR_REPOSITORY_NAME = 'SyncAttachmentRepository';

export const BUNDLED_FOLDERS = ['aura', 'lwc', 'waveTemplates', 'experiences'];
export const BUNDLED_FOLDERS_REGEXP = new RegExp(`^(${BUNDLED_FOLDERS.join('|')})`);

export const IGNORE_FLOSUM_NAMESPACE = !!process.env.IGNORE_FLOSUM_NAMESPACE;
export const IGNORE_FLOSUM_GIT_NAMESPACE = !!process.env.IGNORE_FLOSUM_GIT_NAMESPACE;

export const FLOSUM_NAMESPACE = IGNORE_FLOSUM_NAMESPACE ? '' : 'Flosum__';
export const FLOSUM_GIT_NAMESPACE = IGNORE_FLOSUM_GIT_NAMESPACE ? '' : 'flosum_git__';

export const FLOSUM_COMPONENT = `${FLOSUM_NAMESPACE}Component__c`;
export const FLOSUM_COMPONENT_HISTORY = `${FLOSUM_NAMESPACE}Component_History__c`;
export const FLOSUM_COMMIT = `${FLOSUM_NAMESPACE}Commit__c`;
export const FLOSUM_COMMIT_MANIFEST = `${FLOSUM_NAMESPACE}Commit_Manifest__c`;
export const FLOSUM_ATTACHMENT = `Attachment`;
export const FLOSUM_BRANCH = `${FLOSUM_NAMESPACE}Branch__c`;
export const FLOSUM_REPOSITORY = `${FLOSUM_NAMESPACE}Repository__c`;

export const BRANCH_NAME_REGEXP = /^[a-zA-Z0-9_\-\.\/]+$/;
export const REPOSITORY_NAME_REGEXP = /^[a-zA-Z0-9_\-\.]+$/;

export const PFX_AUTHORITY_FILE_NAME = 'authority.pfx';
export const AUTHORITY_FILE_PATH = path.join(process.cwd(), 'certs', PFX_AUTHORITY_FILE_NAME);
