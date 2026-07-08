import { Router } from 'express';
import { z } from 'zod';
import { authenticate, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { staffTargetService } from '../services/staff-target.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);
router.use(adminOnly);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const periodMonth = String(req.query.periodMonth || '');
    const rows = await staffTargetService.list(req.businessId!, periodMonth);
    sendSuccess(res, rows);
  })
);

router.put(
  '/:userId',
  asyncHandler(async (req: BusinessRequest, res) => {
    const body = z
      .object({
        periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        salesTarget: z.number().min(0).optional(),
        ptTarget: z.number().min(0).optional(),
      })
      .parse(req.body);

    const target = await staffTargetService.upsert(
      req.businessId!,
      String(req.params.userId),
      body.periodMonth,
      { salesTarget: body.salesTarget, ptTarget: body.ptTarget }
    );
    sendSuccess(res, target);
  })
);

export default router;
