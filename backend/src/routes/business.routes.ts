import { Router } from 'express';
import { z } from 'zod';
import { Role } from '../types/enums';
import { authenticate, AuthRequest } from '../middleware/auth';
import { businessService } from '../services/business.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const businesses = await businessService.listForUser(req.user!.userId, req.user!.role);
    sendSuccess(res, businesses);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user!.role !== Role.SUPERADMIN) {
      return res.status(403).json({ success: false, error: 'Only product super admin can create gyms' });
    }
    const { name } = z.object({ name: z.string().min(2) }).parse(req.body);
    const business = await businessService.createBusiness(req.user!.userId, req.user!.role, name);
    sendSuccess(res, business, 201);
  })
);

export default router;
