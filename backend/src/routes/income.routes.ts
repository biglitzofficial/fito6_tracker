import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { upload } from '../middleware/upload';
import { uploadFile } from '../lib/storage';
import { incomeService } from '../services/income.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

const createSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
  accountId: z.string().optional(),
  partyId: z.string().optional(),
  source: z.string().optional(),
  date: z.string(),
  notes: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const result = await incomeService.list(req.businessId!, {
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    sendSuccess(res, result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: BusinessRequest, res) => {
    const item = await incomeService.getById(req.businessId!, String(req.params.id));
    sendSuccess(res, item);
  })
);

router.post(
  '/',
  upload.single('attachment'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = createSchema.parse({ ...req.body, amount: parseFloat(req.body.amount) });
    let attachment: string | undefined;
    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      attachment = uploaded.path;
    }
    const item = await incomeService.create({
      ...data,
      businessId: req.businessId!,
      attachment,
      createdById: req.user!.userId,
    });
    sendSuccess(res, item, 201);
  })
);

router.put(
  '/:id',
  auditLog('UPDATE_INCOME', 'Income'),
  upload.single('attachment'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const body = { ...req.body };
    if (body.amount) body.amount = parseFloat(body.amount);
    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      body.attachment = uploaded.path;
    }
    const item = await incomeService.update(req.businessId!, String(req.params.id), body);
    sendSuccess(res, item);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_INCOME', 'Income'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const result = await incomeService.delete(req.businessId!, String(req.params.id));
    sendSuccess(res, result);
  })
);

export default router;
