import shortid from 'shortid';
import { FS } from './modules/git/internal/fs.internal';
import { Shell } from './modules/git/internal/shell.internal';

// Disable all SFDX staff that produces an error while starting
process.env.SFDX_LOG_LEVEL = 'error';
process.env.SFDX_AUTOUPDATE_DISABLE = 'true';
process.env.SFDX_DISABLE_TELEMETRY = 'true';

export async function preBootstrap(): Promise<void> {
  await Shell.exec('git config --global http.sslVerify false');

  shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

  if (await FS.exists('.temp')) {
    await Shell.exec('rm -rf .temp');
  }

  if (await FS.exists('.sockets')) {
    await Shell.exec('rm -rf .sockets/*');
  } else {
    await FS.makeDir('.sockets');
  }
}
