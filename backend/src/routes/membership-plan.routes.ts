import { Router } from 'express';
import { z } from 'zod';
import { PlanKind } from '../types/enums';
import { authenticate, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { membershipPlanService } from '../services/membership-plan.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const kind = req.query.kind as PlanKind | undefined;
    const plans = await membershipPlanService.list(req.businessId!, kind);
    sendSuccess(res, plans);
  })
);

router.post(
  '/',
  auditLog('CREATE_MEMBERSHIP_PLAN', 'MembershipPlan'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2),
        kind: z.nativeEnum(PlanKind),
        description: z.string().trim().optional(),
        durationDays: z.coerce.number().int().positive(),
        sessionsTotal: z.coerce.number().int().positive().optional(),
        priceExGst: z.coerce.number().positive(),
        gstRate: z.coerce.number().min(0).max(100).default(18),
      })
      .parse(req.body);
    const plan = await membershipPlanService.create({ ...data, businessId: req.businessId! });
    sendSuccess(res, plan, 201);
  })
);

router.put(
  '/:id',
  auditLog('UPDATE_MEMBERSHIP_PLAN', 'MembershipPlan'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).optional(),
        kind: z.nativeEnum(PlanKind).optional(),
        description: z.string().trim().nullable().optional(),
        durationDays: z.coerce.number().int().positive().optional(),
        sessionsTotal: z.coerce.number().int().positive().nullable().optional(),
        priceExGst: z.coerce.number().positive().optional(),
        gstRate: z.coerce.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const plan = await membershipPlanService.update(req.businessId!, String(req.params.id), data);
    sendSuccess(res, plan);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_MEMBERSHIP_PLAN', 'MembershipPlan'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const plan = await membershipPlanService.delete(req.businessId!, String(req.params.id));
    sendSuccess(res, plan);
  })
);

export default router;
