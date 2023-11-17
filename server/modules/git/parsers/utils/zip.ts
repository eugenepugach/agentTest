import JSZip from 'jszip';

export class Zip {
  public static unzip(body: string): Promise<JSZip> {
    return JSZip.loadAsync(body, { base64: true });
  }

  public static createZip(): JSZip {
    return new JSZip();
  }
}
