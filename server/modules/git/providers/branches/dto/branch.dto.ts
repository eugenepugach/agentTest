export class BranchDto {
  public name: string;
  public sha: string;

  public static fromAzure(body: Record<string, any>): BranchDto {
    const dto = new BranchDto();

    dto.name = body?.name?.replace('refs/heads/', '');
    dto.sha = body?.objectId;

    return dto;
  }

  public static fromGithub(body: Record<string, any>): BranchDto {
    const dto = new BranchDto();

    dto.name = body.name || body.ref?.split('/').pop();
    dto.sha = body.commit?.sha || body.object?.sha;

    return dto;
  }

  public static fromGitlab(body: Record<string, any>): BranchDto {
    const dto = new BranchDto();

    dto.name = body.name;
    dto.sha = body.commit?.id;

    return dto;
  }

  public static fromBitbucket(body: Record<string, any>): BranchDto {
    const dto = new BranchDto();

    dto.name = body.name;
    dto.sha = body.target?.hash;

    return dto;
  }

  public static fromBitbucketServer(body: Record<string, any>): BranchDto {
    const dto = new BranchDto();

    dto.name = body.displayId;
    dto.sha = body.latestCommit;

    return dto;
  }
}
