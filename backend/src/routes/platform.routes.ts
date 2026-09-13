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
  '/franchise-performance',
  asyncHandler(async (_req: AuthRequest, res) => {
    const data = await platformService.getFranchisePerformance();
    sendSuccess(res, data);
  })
);

router.get(
  '/gyms/:id/performance',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await platformService.getGymPerformanceDetail(String(req.params.id));
    sendSuccess(res, data);
  })
);

router.get(
  '/gyms/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const gym = await platformService.getGymById(String(req.params.id));
    sendSuccess(res, gym);
  })
);

router.patch(
  '/gyms/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const { gymName } = z.object({ gymName: z.string().min(2) }).parse(req.body);
    const result = await platformService.updateGym(String(req.params.id), gymName, req.user!.userId);
    sendSuccess(res, result);
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
