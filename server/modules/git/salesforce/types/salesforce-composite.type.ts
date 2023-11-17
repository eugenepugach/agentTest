export type CompositeRequestBody = {
  url: string;
  body?: Record<string, any>;
  referenceId?: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
};

export type CompositeResponseBody = {
  body:
    | {
        id: string;
        success: boolean;
        errors: any[];
      }
    | { message: string; errorCode: string }[];
  httpStatusCode: number;
  referenceId: string;
};

export type CompositeGraphsRequest = {
  graphId: string;
  compositeRequest: CompositeRequestBody[];
}[];

export type CompositeGraphsResponse = {
  graphs: {
    graphId: string;
    isSuccessful: boolean;
    graphResponse: {
      compositeResponse: CompositeResponseBody[];
    };
  }[];
};
