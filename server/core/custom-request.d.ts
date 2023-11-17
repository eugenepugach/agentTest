import { Context } from './classes/context.class';

declare global {
  namespace Express {
    export interface Request {
      context: Context;
    }
  }
}
