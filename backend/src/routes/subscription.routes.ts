import { Router } from 'express';
import { z } from 'zod';
import { PlanKind } from '../types/enums';
import { authenticate } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { subscriptionService } from '../services/subscription.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

const createSchema = z.object({
  kind: z.nativeEnum(PlanKind),
  partyId: z.string(),
  planId: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  amountPaid: z.coerce.number().positive().optional(),
  billRepId: z.string().optional(),
  trainerStaffId: z.string().optional(),
  accountId: z.string().optional(),
  notes: z.string().trim().optional(),
  createIncome: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const kind = req.query.kind as PlanKind | undefined;
    const partyId = req.query.partyId as string | undefined;
    const items = await subscriptionService.list(req.businessId!, kind, partyId);
    sendSuccess(res, items);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: BusinessRequest, res) => {
    const item = await subscriptionService.getById(req.businessId!, String(req.params.id));
    sendSuccess(res, item);
  })
);

router.post(
  '/',
  auditLog('CREATE_SUBSCRIPTION', 'Subscription'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = createSchema.parse(req.body);
    const item = await subscriptionService.create({
      ...data,
      businessId: req.businessId!,
      createdById: req.user!.userId,
    });
    sendSuccess(res, item, 201);
  })
);

router.post(
  '/:id/renew',
  auditLog('RENEW_SUBSCRIPTION', 'Subscription'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        amountPaid: z.coerce.number().positive().optional(),
        billRepId: z.string().optional(),
        trainerStaffId: z.string().optional(),
        accountId: z.string().optional(),
        notes: z.string().trim().optional(),
        createIncome: z.boolean().optional(),
      })
      .parse(req.body);
    const item = await subscriptionService.renew(req.businessId!, String(req.params.id), {
      ...data,
      createdById: req.user!.userId,
    });
    sendSuccess(res, item, 201);
  })
);

router.patch(
  '/:id/cancel',
  auditLog('CANCEL_SUBSCRIPTION', 'Subscription'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const item = await subscriptionService.cancel(req.businessId!, String(req.params.id));
    sendSuccess(res, item);
  })
);

export default router;
