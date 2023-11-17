export class FlosumConstants {
  public static readonly API_VERSION = 'v52.0';

  public static readonly SALESFORCE_UNDEFINED_ERROR = 'SALESFORCE_UNDEFINED_ERROR';

  public static readonly BACKUP_ZIP_NAME = 'BACKUP ZIP';

  public static readonly ENDPOINT_UPSERT_RECORD = `/services/data/${FlosumConstants.API_VERSION}/sobjects`;
  public static readonly ENDPOINT_INSERT_MULTIPLE_RECORDS = `services/data/${FlosumConstants.API_VERSION}/composite/sobjects`;
  public static readonly ENDPOINT_QUERY = `/services/data/${FlosumConstants.API_VERSION}/query/`;
}
