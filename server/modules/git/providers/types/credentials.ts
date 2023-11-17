export type BitbucketCredentials = {
  workspace: string;
  project: string;
  clientId: string;
  clientSecret: string;
};

export type BitbucketServerCredentials = {
  username: string;
  token: string;
  project: string;
  baseURL: string;
};

export type GitlabCredentials = {
  username: string;
  token: string;
};

export type GitlabServerCredentials = {};

export type GithubCredentials = {};
export type GithubServerCredentials = {};

export type AzureCredentials = {};
export type AzureServerCredentials = {};
