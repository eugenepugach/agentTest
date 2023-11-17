import { copyFile, mkdir, rm } from 'fs/promises';
import config from './tsconfig.json';
import { FS } from './server/modules/git/internal/fs.internal';

const outDir = config.compilerOptions.outDir;

(async function build() {
  if (await FS.exists(outDir)) await rm(outDir, { recursive: true });
  await mkdir(outDir);
  await copyFile('package.json', `${outDir}/package.json`);
  await copyFile('package-lock.json', `${outDir}/package-lock.json`);

  await mkdir(`${outDir}/public`);
  await copyFile('public/index.html', `${outDir}/public/index.html`);
  await mkdir(`${outDir}/modules/git/parsers/utils`, { recursive: true });
  await copyFile('./server/modules/git/parsers/utils/__x2js.js', `${outDir}/modules/git/parsers/utils/__x2js.js`);
})();
