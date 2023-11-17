import { InternalServerError } from '@/core/errors/internal-server.error';
import { GitChanges } from './types/git-changes.type';

const GIT_AUTHOR_REGEXP = /Author\:\s(.+)$/m;
const GIT_EMAIL_REGEXP = /Email\:\s(.+)$/m;
const GIT_MESSAGE_REGEXP = /Message\:\s(.+)$/m;
const GIT_CHANGE_REGEXP = /^(D|M|A)\s+([^\n]+)/;

export function extractAuthorFromCommitDescribe(describe: string): string {
  const authorMatch = describe.match(GIT_AUTHOR_REGEXP);

  if (!authorMatch) {
    return '';
  }

  return authorMatch[1];
}

export function extractEmailFromCommitDescribe(describe: string): string {
  const emailMatch = describe.match(GIT_EMAIL_REGEXP);

  if (!emailMatch) {
    return '';
  }

  return emailMatch[1];
}

export function extractMessageFromCommitDescribe(describe: string): string {
  const messageMatch = describe.match(GIT_MESSAGE_REGEXP);

  if (!messageMatch) {
    return '';
  }

  return messageMatch[1];
}

export function extractChangesFromCommitDescribe(describe: string): GitChanges {
  const changes: GitChanges = {
    added: [],
    modified: [],
    removed: [],
  };

  describe
    .split('\n')
    .map((line) => line.match(GIT_CHANGE_REGEXP) as RegExpMatchArray)
    .filter((match) => !!match)
    .forEach(([, type, filePath]) => {
      switch (type) {
        case 'A':
          changes.added.push(filePath);
          break;
        case 'M':
          changes.modified.push(filePath);
          break;
        case 'D':
          changes.removed.push(filePath);
          break;
      }
    });

  return changes;
}

export function parseGitError(error: Error): string {
  const message = error.message || (error as unknown as string);

  if (
    message.includes('merge') ||
    message.includes('pull request') ||
    message.includes('Warning!') ||
    message.includes('warning:') ||
    message.includes('Switched')
  ) {
    return message;
  }

  throw new InternalServerError(error);
}
