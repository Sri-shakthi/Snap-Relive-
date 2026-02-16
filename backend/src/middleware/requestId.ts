import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existing = req.header('x-request-id');
  req.requestId = existing || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
};
