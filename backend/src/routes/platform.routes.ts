import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, superAdminOnly } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { platformService } from '../services/platform.service';
import { AppError, asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(superAdminOnly);

router.get(
  '/gyms',
  asyncHandler(async (_req: AuthRequest, res) => {
    const gyms = await platformService.listGyms();
    sendSuccess(res, gyms);
  })
);

router.get(
  '/analytics',
  asyncHandler(async (_req: AuthRequest, res) => {
    const analytics = await platformService.getAnalytics();
    sendSuccess(res, analytics);
  })
);

router.get(
  '/franchise-performance',
  asyncHandler(async (_req: AuthRequest, res) => {
    const data = await platformService.getFranchisePerformance();
    sendSuccess(res, data);
  })
);

router.get(
  '/gyms/:id/performance',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await platformService.getGymPerformanceDetail(String(req.params.id));
    sendSuccess(res, data);
  })
);

router.get(
  '/gyms/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const gym = await platformService.getGymById(String(req.params.id));
    sendSuccess(res, gym);
  })
);

router.patch(
  '/gyms/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const { gymName } = z.object({ gymName: z.string().min(2) }).parse(req.body);
    const result = await platformService.updateGym(String(req.params.id), gymName, req.user!.userId);
    sendSuccess(res, result);
  })
);

router.get(
  '/gym-admins',
  asyncHandler(async (_req: AuthRequest, res) => {
    const admins = await platformService.listGymAdmins();
    sendSuccess(res, admins);
  })
);

const createGymAdminSchema = z.object({
  gymName: z.string().min(2),
  branch: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  adminName: z.string().min(2),
  adminPhone: z.string().min(10),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  altPhone: z.string().optional(),
  pan: z.string().optional(),
  gstNo: z.string().optional(),
  franchiseFee: z.coerce.number().nonnegative().optional(),
  royaltyPct: z.coerce.number().min(0).max(100).optional(),
  agreementStartDate: z.string().min(1),
  agreementEndDate: z.string().optional(),
  agreementConfirmed: z
    .union([z.literal('true'), z.literal('1'), z.literal('on'), z.boolean()])
    .transform((v) => v === true || v === 'true' || v === '1' || v === 'on'),
  notes: z.string().optional(),
});

router.post(
  '/gym-admins',
  upload.single('agreement'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new AppError(400, 'Signed franchise agreement upload is required');
    const body = createGymAdminSchema.parse(req.body);
    const result = await platformService.createGymAdmin(
      body,
      {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      req.user!.userId
    );
    sendSuccess(res, result, 201);
  })
);

router.get(
  '/gyms/:id/agreement',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await platformService.getFranchiseAgreementUrl(String(req.params.id));
    sendSuccess(res, data);
  })
);

export default router;
