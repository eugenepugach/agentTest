import { ChildProcess } from 'child_process';
import spawn from 'cross-spawn';
import { INTERPRETER, INTERPRETER_ARGS, INTERPRETER_ENV } from '@/constants/job';

export function objectToArgsList(object: Record<string, any>): string[] {
  const getValue = (value: any) => {
    return value;
  };

  return Object.keys(object).reduce((list: string[], next) => [...list, `--${next}=${getValue(object[next])}`], []);
}

export function executeInterpreter(...args: string[]): ChildProcess {
  return spawn(INTERPRETER, [...INTERPRETER_ARGS, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...INTERPRETER_ENV,
    },
  });
}
