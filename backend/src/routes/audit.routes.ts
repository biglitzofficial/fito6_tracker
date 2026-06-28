import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { auditService, settingsService } from '../services/audit.service';
import { asyncHandler, sendSuccess } from '../utils/response';

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

const DEFAULT_ENTRY_FIELDS = {
  income: { category: true, paymentMode: true },
  expense: { party: true, category: true, paymentMode: true, attachment: true },
};

settingsRouter.get(
  '/entry-fields',
  asyncHandler(async (_req, res) => {
    const value = await settingsService.get('entry_fields');
    sendSuccess(res, value ?? DEFAULT_ENTRY_FIELDS);
  })
);

settingsRouter.use(adminOnly);

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await settingsService.getAll();
    sendSuccess(res, settings);
  })
);

settingsRouter.put(
  '/:key',
  asyncHandler(async (req, res) => {
    const setting = await settingsService.set(req.params.key, req.body.value);
    sendSuccess(res, setting);
  })
);

export { settingsRouter };
