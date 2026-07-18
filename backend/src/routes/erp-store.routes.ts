import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { erpStoreService } from '../services/erp-store.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = await erpStoreService.get(req.businessId!);
    sendSuccess(res, { data, source: data ? 'firestore' : 'empty' });
  })
);

router.put(
  '/',
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const body = z
      .object({
        data: z.record(z.any()),
      })
      .parse(req.body);
    const result = await erpStoreService.save(req.businessId!, body.data, req.user!.userId);
    sendSuccess(res, result);
  })
);

export default router;
