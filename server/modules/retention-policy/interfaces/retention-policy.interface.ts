export interface RetentionPolicy {
  execute(): Promise<void>;
}
