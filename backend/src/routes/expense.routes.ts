import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { upload } from '../middleware/upload';
import { uploadFile } from '../lib/storage';
import { expenseService } from '../services/expense.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
  accountId: z.string().optional(),
  partyId: z.string().optional(),
  vendor: z.string().optional(),
  date: z.string(),
  periodMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM format')
    .optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().min(1).max(31).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await expenseService.list({
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      isRecurring: req.query.isRecurring === 'true' ? true : req.query.isRecurring === 'false' ? false : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    sendSuccess(res, result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await expenseService.getById(req.params.id);
    sendSuccess(res, item);
  })
);

router.post(
  '/',
  upload.single('attachment'),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createSchema.parse({
      ...req.body,
      amount: parseFloat(req.body.amount),
      isRecurring: req.body.isRecurring === 'true',
      recurringDay: req.body.recurringDay ? parseInt(req.body.recurringDay) : undefined,
    });
    let attachment: string | undefined;
    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      attachment = uploaded.path;
    }
    const item = await expenseService.create({
      ...data,
      attachment,
      createdById: req.user!.userId,
    });
    sendSuccess(res, item, 201);
  })
);

router.put(
  '/:id',
  adminOnly,
  auditLog('UPDATE_EXPENSE', 'Expense'),
  upload.single('attachment'),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.amount) body.amount = parseFloat(body.amount);
    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      body.attachment = uploaded.path;
    }
    const item = await expenseService.update(req.params.id, body);
    sendSuccess(res, item);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_EXPENSE', 'Expense'),
  asyncHandler(async (req, res) => {
    const result = await expenseService.delete(req.params.id);
    sendSuccess(res, result);
  })
);

export default router;
