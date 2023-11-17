import { Request, Response } from 'express';

export interface IErrorMiddleware {
  handleError(error: Error, req: Request, res: Response): void | Promise<void>;
}
