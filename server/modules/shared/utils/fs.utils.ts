import { mkdir } from 'fs/promises';
import { FsUtils } from '@flosum/utils';

export async function makeDir(path: string, recursive = true): Promise<void> {
  if (await FsUtils.isExistsPath(path)) {
    return;
  }
  await mkdir(path, { recursive });
}
