export class MetadataItemDto {
  public name: string;
  public apiName: string;
  public snapshotId: string;
  public label: string;
  public isRetrieved: boolean;
  public veevaComponentType: string;
  public attachmentId: string;
  public lastModifiedDate: string;
  public body: string | Buffer;
}
