import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { payrollService } from '../services/payroll.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);
router.use(adminOnly);

const periodSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM format'),
  accountId: z.string().optional(),
});

router.get(
  '/preview',
  asyncHandler(async (req: BusinessRequest, res) => {
    const periodMonth =
      (req.query.periodMonth as string) ||
      new Date().toISOString().slice(0, 7);
    const result = await payrollService.preview(req.businessId!, periodMonth);
    sendSuccess(res, result);
  })
);

router.post(
  '/generate',
  auditLog('GENERATE_PAYROLL', 'Expense'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { periodMonth, accountId } = periodSchema.parse(req.body);
    const result = await payrollService.generate(
      req.businessId!,
      periodMonth,
      req.user!.userId,
      accountId
    );
    sendSuccess(res, result, 201);
  })
);

export default router;
