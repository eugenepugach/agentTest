import { BUNDLED_FOLDERS_REGEXP, FORCE_APP_DEFAULT_DIR, META_XML_EXTENSION } from '@/constants';
import { ERR_UNKNOWN_GIT_SERVICE } from '@/constants/errors';
import { BadRequestError } from '@/core/errors/bad-request.error';
import { GitProvider } from '@/modules/git/providers/types/git-provider';
import { GitCommitDto } from '../dto/git-commit.dto';
import path from 'path';
import { Context } from '@/core';
import { isVlocityComponent } from '@/modules/git/parsers/utils/vlocity';

export function extractGitCommitDtoFromContext(ctx: Context, provider: GitProvider): GitCommitDto {
  let dto: GitCommitDto;

  switch (provider) {
    case GitProvider.Github:
    case GitProvider.GithubServer:
      dto = GitCommitDto.fromGithub(ctx);
      break;
    case GitProvider.Azure:
    case GitProvider.AzureServer:
      dto = GitCommitDto.fromAzure(ctx);
      break;
    case GitProvider.Bitbucket:
      dto = GitCommitDto.fromBitbucket(ctx);
      break;
    case GitProvider.BitbucketServer:
      dto = GitCommitDto.fromBitbucketServer(ctx);
      break;
    case GitProvider.Gitlab:
    case GitProvider.GitlabServer:
      dto = GitCommitDto.fromGitlab(ctx);
      break;
    default:
      throw new BadRequestError(ERR_UNKNOWN_GIT_SERVICE);
  }

  dto.provider = provider;

  return dto;
}

export function isPathsEquals(path1: string, path2: string): boolean {
  return path1.replace(path.extname(path1), '') === path2.replace(path.extname(path2), '');
}

export function prepareGitChangedPaths(paths: string[], isSFDXProject = false): string[] {
  if (isSFDXProject) {
    paths = paths.filter((filePath) => filePath.startsWith(FORCE_APP_DEFAULT_DIR));
  }

  return [
    ...new Set(
      paths.map((filePath) => {
        if (filePath.startsWith(FORCE_APP_DEFAULT_DIR)) {
          const unfoldedPath = filePath.replace(FORCE_APP_DEFAULT_DIR, '').substr(1);

          const [componentType, componentName] = unfoldedPath.split('/');

          let name = componentName;

          if (name.endsWith(META_XML_EXTENSION)) {
            name = name.replace(META_XML_EXTENSION, '');
          }

          if (path.extname(name)) {
            name = name.replace(path.extname(name), '');
          }

          return path.join(componentType, name);
        }

        const convertedFilePath = path.relative('.', filePath);

        if (BUNDLED_FOLDERS_REGEXP.test(convertedFilePath) || isVlocityComponent(convertedFilePath)) {
          const [componentType, componentName] = convertedFilePath.split(path.sep);

          return path.join(componentType, componentName);
        }

        return convertedFilePath;
      })
    ),
  ].map((filePath) => filePath.split(path.sep).join(path.posix.sep));
}
