import { exec } from 'child_process';

export class Shell {
  public static exec(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        command,
        {
          maxBuffer: 256 * 1024 * 1024,
        },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(stdout);
        }
      );
    });
  }
}
