import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/enums';
import { User } from '../types/models';
import { COL, getById } from '../lib/firestore';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: JwtPayload & { name: string };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await getById<User>(COL.users, payload.userId);
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid or inactive account');
    }

    req.user = { userId: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError(401, 'Invalid token'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  return authorize(Role.ADMIN)(req, res, next);
}
