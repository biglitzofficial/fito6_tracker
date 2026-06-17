import { Router } from 'express';
import { z } from 'zod';
import { DocumentType } from '@prisma/client';
import path from 'path';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { documentService } from '../services/document.service';
import { config } from '../config';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await documentService.list({
      search: req.query.search as string,
      type: req.query.type as DocumentType | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    sendSuccess(res, result);
  })
);

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new Error('No file uploaded');
    const { type, category } = z
      .object({ type: z.nativeEnum(DocumentType), category: z.string().optional() })
      .parse(req.body);

    const doc = await documentService.create({
      name: req.file.originalname,
      type,
      filePath: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      uploadedById: req.user!.userId,
    });
    sendSuccess(res, doc, 201);
  })
);

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const doc = await documentService.getById(req.params.id);
    res.download(path.join(config.uploadDir, doc.filePath), doc.name);
  })
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const result = await documentService.delete(req.params.id);
    sendSuccess(res, result);
  })
);

export default router;
