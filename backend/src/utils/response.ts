import { Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode = 400, code?: string) {
  res.status(statusCode).json({ success: false, error: message, code });
}

export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
