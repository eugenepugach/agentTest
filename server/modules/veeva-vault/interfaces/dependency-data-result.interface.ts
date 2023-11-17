export interface DependencyDataResult {
  name: string;
  type: string;
  label: string;
  dependencies: DependencyRecord[];
}

export interface DependencyRecord {
  label: string;
  name: string;
  type: string;
  lastUpdate: string;
  isMissing: boolean;
}
