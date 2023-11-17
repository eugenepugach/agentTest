export class HookDto {
  public id: string;
  public events: string[];
  public active: boolean;
  public url: string;

  public static fromAzure(body: Record<string, any>): HookDto {
    const dto = new HookDto();

    dto.id = body.id;
    dto.events = [];
    dto.active = true;
    dto.url = body.consumerInputs.url;

    return dto;
  }

  public static fromBitbucketServer(body: Record<string, any>): HookDto {
    const dto = new HookDto();

    dto.id = body.id;
    dto.events = body.events;
    dto.active = body.active;
    dto.url = body.url;

    return dto;
  }

  public static fromBitbucket(body: Record<string, any>): HookDto {
    const dto = new HookDto();

    dto.id = body.uuid;
    dto.events = body.events;
    dto.active = body.active;
    dto.url = body.url;

    return dto;
  }

  public static fromGitlab(body: Record<string, any>): HookDto {
    const dto = new HookDto();

    dto.id = body.id.toString();
    dto.url = body.url;
    dto.active = true;
    dto.events = Object.keys(body).filter((key) => key.endsWith('events'));

    return dto;
  }

  public static fromGithub(body: Record<string, any>): HookDto {
    const dto = new HookDto();

    dto.id = body.id.toString();
    dto.url = body.config.url;
    dto.active = body.active;
    dto.events = body.events;

    return dto;
  }
}
