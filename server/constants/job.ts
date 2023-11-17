const DEBUG_INTERPRETER_ARGS = process.env.DEBUG_INTERPRETER_ARGS?.split(',') || [];

export const INTERPRETER = 'node';

export const INTERPRETER_ARGS =
  process.env.NODE_ENV === 'production'
    ? [...DEBUG_INTERPRETER_ARGS, '--max-old-space-size=15000']
    : [
        ...DEBUG_INTERPRETER_ARGS,
        '--require=ts-node/register',
        '--require=tsconfig-paths/register',
        '--max-old-space-size=15000',
      ];

export const INTERPRETER_ENV =
  process.env.NODE_ENV === 'production'
    ? {}
    : {
        TS_NODE_FILES: 'true',
      };

export const JOB_PATH = '../job/job';

export const MANIFEST_FILENAME = 'manifest.json';

export const JOB_LOG_STATE_FILENAME = 'job-log-state.json';
export const JOB_LOG_DETAILS_FILENAME = 'job-log-details.csv';
