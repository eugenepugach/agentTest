import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { FlosumRepositorySyncDto } from '../../salesforce/dto/flosum-repository-sync.dto';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

export class GitSyncDto {
  public repository: Repo;
  public branch: string;
  public repositoryGit: string;
  public provider: GitProvider;
  public syncRecord: FlosumRepositorySyncDto;
}
