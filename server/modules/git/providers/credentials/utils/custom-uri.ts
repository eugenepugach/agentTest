export class CustomUri {
  public static encode(component: string): string {
    return encodeURIComponent(component)
      .replace(/\-/g, '%2D')
      .replace(/\_/g, '%5F')
      .replace(/\./g, '%2E')
      .replace(/\!/g, '%21')
      .replace(/\~/g, '%7E')
      .replace(/\*/g, '%2A')
      .replace(/\'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  public static decode(component: string): string {
    return decodeURIComponent(
      component
        .replace(/\\%2D/g, '-')
        .replace(/\\%5F/g, '_')
        .replace(/\\%2E/g, '.')
        .replace(/\\%21/g, '!')
        .replace(/\\%7E/g, '~')
        .replace(/\\%2A/g, '*')
        .replace(/\\%27/g, "'")
        .replace(/\\%28/g, '(')
        .replace(/\\%29/g, ')')
    );
  }
}
