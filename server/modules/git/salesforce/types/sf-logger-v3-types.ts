export enum LoggerTypes {
  commit = 'Commit',
}

export type Message = {
  timestamp: number;
  type: string;
  message: string;
};
