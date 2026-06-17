import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { dashboardService } from '../services/dashboard.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate);

router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await authService.getProfile(req.user!.userId);
    sendSuccess(res, user);
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user!.role === Role.ADMIN) {
      const data = await dashboardService.getAdminDashboard();
      sendSuccess(res, data);
    } else {
      const data = await dashboardService.getStaffDashboard(req.user!.userId);
      sendSuccess(res, data);
    }
  })
);

export default router;
