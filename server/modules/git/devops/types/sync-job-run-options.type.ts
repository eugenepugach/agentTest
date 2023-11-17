import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { FlosumRepositorySyncDto } from '../../salesforce/dto/flosum-repository-sync.dto';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

export type SyncJobRunOptions = {
  syncRecord: FlosumRepositorySyncDto;
  repository: Repo;
  convertToSFDX: boolean;
  provider: GitProvider;
};
