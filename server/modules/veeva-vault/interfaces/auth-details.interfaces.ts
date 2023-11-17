export interface BaseAuthDetails {
  accessToken: string;
}

export interface SalesforceAuthDetails extends BaseAuthDetails {
  instanceUrl: string;
}

export interface VeevaAuthDetails extends BaseAuthDetails {
  instanceUrl: string;
  username: string;
  password: string;
}
