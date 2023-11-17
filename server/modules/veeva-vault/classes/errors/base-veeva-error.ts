export abstract class BaseVeevaError<T> extends Error {
  public errors: T[];

  protected constructor(message: string, errors: T[]) {
    super(message);
    this.errors = errors;
  }

  public abstract getMessages(): string[];
}
