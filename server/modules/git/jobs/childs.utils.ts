export function getSocketPath(): string {
  return process.argv.find((arg) => arg.startsWith('--socketPath='))?.split('--socketPath=')[1] || '';
}
