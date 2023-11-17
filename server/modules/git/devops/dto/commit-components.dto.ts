import { BranchDto } from '../../providers/branches/dto/branch.dto';
import { Repo } from '@/modules/git/providers/repositories/repo.class';
import { FlosumComponent } from '../../salesforce/types/flosum-component.type';
import { DeletedComponent } from '../../salesforce/types/deleted-component.type';
import { GitProvider } from '@/modules/git/providers/types/git-provider';

export class CommitComponentsDto {
  public repo: Repo;
  public branch: BranchDto;
  public provider: GitProvider;
  public components: {
    writed?: FlosumComponent[];
    deleted?: DeletedComponent[];
  };
  public message: string;
  public user: {
    name: string;
    email: string;
  };
  public convertToSFDX: boolean;
  public force = false;
}
