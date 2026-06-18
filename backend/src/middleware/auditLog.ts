import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { COL, create } from '../lib/firestore';

export function auditLog(action: string, entity?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode < 400) {
        const entityId = typeof req.params?.id === 'string' ? req.params.id : undefined;
        create(COL.auditLogs, {
          userId: req.user?.userId,
          action,
          entity,
          entityId,
          details: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body as Record<string, unknown>),
          },
          ipAddress:
            (typeof req.headers['x-forwarded-for'] === 'string'
              ? req.headers['x-forwarded-for']
              : undefined) || req.socket.remoteAddress,
          userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        }).catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
}

function sanitizeBody(body: Record<string, unknown>) {
  if (!body) return {};
  const { password, ...rest } = body;
  return rest;
}
