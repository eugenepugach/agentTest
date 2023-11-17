import { mkdir, stat } from 'fs/promises';

export async function makeDir(path: string, recursive = true): Promise<void> {
  if (await exists(path)) {
    return;
  }
  await mkdir(path, { recursive });
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
}
