import { Response, NextFunction } from 'express';
import { Role } from '../types/enums';
import { AuthRequest } from './auth';
import { businessService } from '../services/business.service';
import { AppError } from '../utils/response';

export interface BusinessRequest extends AuthRequest {
  businessId?: string;
}

export async function requireBusiness(req: BusinessRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    const businessId = req.headers['x-business-id'];
    if (typeof businessId !== 'string' || !businessId.trim()) {
      return next(new AppError(400, 'Business context required'));
    }

    if (req.user.role === Role.SUPERADMIN) {
      req.businessId = businessId.trim();
      return next();
    }

    const membership = await businessService.getMembership(req.user.userId, businessId.trim());
    if (!membership) {
      return next(new AppError(403, 'You do not have access to this business'));
    }

    req.businessId = businessId;
    next();
  } catch (error) {
    next(error);
  }
}
