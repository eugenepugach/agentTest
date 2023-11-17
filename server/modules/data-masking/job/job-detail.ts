import { Logger as SystemLogger } from '@/core';
import minimist from 'minimist';

export const { jobStorePath, jobId } = minimist(process.argv.slice(2));

export const systemLogger = new SystemLogger(jobId);
