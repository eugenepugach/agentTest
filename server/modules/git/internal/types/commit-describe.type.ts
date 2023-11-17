import { GitChanges } from './git-changes.type';

export type CommitDescribe = {
  author: string;
  email: string;
  message: string;
  changes: GitChanges;
};
