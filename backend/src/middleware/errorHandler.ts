import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'Route not found' });
}
