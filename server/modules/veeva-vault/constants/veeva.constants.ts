export class VeevaConstants {
  public static readonly VERSION = 'v22.2';

  public static readonly API_LIMIT_EXCEEDED = 'API_LIMIT_EXCEEDED';
  public static readonly INVALID_SESSION_ID = 'INVALID_SESSION_ID';

  public static readonly VEEVA_UNDEFINED_ERROR = 'VEEVA_UNDEFINED_ERROR';

  public static readonly BUILD_WHERE_BY_NAME_LIMIT = 150;
  public static readonly BUILD_WHERE_BY_ID_LIMIT = 300;

  public static readonly MAXIMUM_SIZE_OF_PACKAGE = 200;

  public static readonly ENDPOINT_AUTH = `/api/${VeevaConstants.VERSION}/auth`;
  public static readonly ENDPOINT_AUTH_CHECK_SESSION = `/api/${VeevaConstants.VERSION}/objects/users/me`;
  public static readonly ENDPOINT_CREATE_RECORDS = `/api/${VeevaConstants.VERSION}/vobjects/`;
  public static readonly ENDPOINT_VQL = `/api/${VeevaConstants.VERSION}/query?q=`;
  public static readonly ENDPOINT_EXPORT_IMPORT_PACKAGE = `/api/${VeevaConstants.VERSION}/services/package`;
  public static readonly ENDPOINT_DEPLOY_PACKAGE = `/api/${VeevaConstants.VERSION}/vobject/vault_package__v/{package_id}/actions/deploy`;
  public static readonly ENDPOINT_VALIDATE_PACKAGE = `/api/${VeevaConstants.VERSION}/services/vobject/vault_package__v/{package_id}/actions/validate`;
  public static readonly ENDPOINT_VALIDATE_VPK = `/api/${VeevaConstants.VERSION}/services/package/actions/validate`;

  public static readonly MDL_EXTENSION = '.mdl';
  public static readonly DEPENDENCY_EXTENSION = '.dep';
}
