export interface SalesforceDmlErrorDetails {
  statusCode: string;
  message: string;
  fields: string[];
}

export interface VeevaErrorDetails {
  type: string;
  message: string;
}
