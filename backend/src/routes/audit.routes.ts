import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditService, settingsService } from '../services/audit.service';
import { asyncHandler, sendSuccess } from '../utils/response';
import { DEFAULT_STAFF_ACCESS, mergeStaffAccess } from '../lib/staff-access';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await auditService.list({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      userId: req.query.userId as string,
    });
    sendSuccess(res, result);
  })
);

export default router;

const settingsRouter = Router();
settingsRouter.use(authenticate);
settingsRouter.use(requireBusiness);

const DEFAULT_ENTRY_FIELDS = {
  income: { party: true, category: true, paymentMode: true, staff: true },
  expense: { party: true, category: true, paymentMode: true, attachment: true },
};

settingsRouter.get(
  '/entry-fields',
  asyncHandler(async (req: BusinessRequest, res) => {
    const value = await settingsService.get('entry_fields', req.businessId!);
    sendSuccess(res, value ?? DEFAULT_ENTRY_FIELDS);
  })
);

settingsRouter.get(
  '/staff-access',
  asyncHandler(async (req: BusinessRequest, res) => {
    const value = await settingsService.get('staff_access', req.businessId!);
    sendSuccess(res, mergeStaffAccess(value ?? DEFAULT_STAFF_ACCESS));
  })
);

settingsRouter.use(adminOnly);

settingsRouter.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const settings = await settingsService.getAll(req.businessId!);
    sendSuccess(res, settings);
  })
);

settingsRouter.put(
  '/:key',
  asyncHandler(async (req: BusinessRequest, res) => {
    const setting = await settingsService.set(String(req.params.key), req.body.value, req.businessId!);
    sendSuccess(res, setting);
  })
);

export { settingsRouter };
