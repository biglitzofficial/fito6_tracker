import { Router } from 'express';
import { z } from 'zod';
import { CategoryType } from '@prisma/client';
import { authenticate, adminOnly } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { categoryService } from '../services/category.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = req.query.type as CategoryType | undefined;
    const categories = await categoryService.list(type);
    sendSuccess(res, categories);
  })
);

router.post(
  '/',
  adminOnly,
  auditLog('CREATE_CATEGORY', 'Category'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({ name: z.string(), type: z.nativeEnum(CategoryType), parentId: z.string().optional() })
      .parse(req.body);
    const category = await categoryService.create(data);
    sendSuccess(res, category, 201);
  })
);

router.put(
  '/:id',
  adminOnly,
  auditLog('UPDATE_CATEGORY', 'Category'),
  asyncHandler(async (req, res) => {
    const category = await categoryService.update(req.params.id, req.body);
    sendSuccess(res, category);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_CATEGORY', 'Category'),
  asyncHandler(async (req, res) => {
    const category = await categoryService.delete(req.params.id);
    sendSuccess(res, category);
  })
);

export default router;
