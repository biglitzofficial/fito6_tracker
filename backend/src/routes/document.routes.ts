import { Router } from 'express';
import { z } from 'zod';
import { DocumentType } from '../types/enums';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { documentService } from '../services/document.service';
import { uploadFile, getSignedDownloadUrl } from '../lib/storage';
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

    const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    const doc = await documentService.create({
      name: req.file.originalname,
      type,
      filePath: uploaded.path,
      fileSize: uploaded.size,
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
    const url = await getSignedDownloadUrl(doc.filePath, doc.name);
    res.redirect(url);
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
