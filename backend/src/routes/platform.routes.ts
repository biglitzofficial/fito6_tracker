import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, superAdminOnly } from '../middleware/auth';
import { platformService } from '../services/platform.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(superAdminOnly);

router.get(
  '/gyms',
  asyncHandler(async (_req: AuthRequest, res) => {
    const gyms = await platformService.listGyms();
    sendSuccess(res, gyms);
  })
);

router.get(
  '/analytics',
  asyncHandler(async (_req: AuthRequest, res) => {
    const analytics = await platformService.getAnalytics();
    sendSuccess(res, analytics);
  })
);

router.get(
  '/gym-admins',
  asyncHandler(async (_req: AuthRequest, res) => {
    const admins = await platformService.listGymAdmins();
    sendSuccess(res, admins);
  })
);

router.post(
  '/gym-admins',
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z
      .object({
        gymName: z.string().min(2),
        adminName: z.string().min(2),
        adminEmail: z.string().email(),
        adminPassword: z.string().min(8),
      })
      .parse(req.body);
    const result = await platformService.createGymAdmin(body);
    sendSuccess(res, result, 201);
  })
);

export default router;
