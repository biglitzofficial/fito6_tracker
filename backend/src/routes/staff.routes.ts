import { Router } from 'express';
import { z } from 'zod';
import { authenticate, adminOnly } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { staffService } from '../services/staff.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  salary: z.number().min(0),
  joiningDate: z.string(),
  password: z.string().min(8),
  sendWelcomeEmail: z.boolean().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(8),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const staff = await staffService.list(req.query.includeInactive === 'true');
    sendSuccess(res, staff);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const staff = await staffService.getById(req.params.id);
    sendSuccess(res, staff);
  })
);

router.post(
  '/',
  auditLog('CREATE_STAFF', 'Staff'),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const staff = await staffService.create(data);
    sendSuccess(res, staff, 201);
  })
);

router.put(
  '/:id',
  auditLog('UPDATE_STAFF', 'Staff'),
  asyncHandler(async (req, res) => {
    const staff = await staffService.update(req.params.id, req.body);
    sendSuccess(res, staff);
  })
);

router.patch(
  '/:id/password',
  auditLog('RESET_STAFF_PASSWORD', 'Staff'),
  asyncHandler(async (req, res) => {
    const { password } = passwordSchema.parse(req.body);
    const result = await staffService.setPassword(req.params.id, password);
    sendSuccess(res, result);
  })
);

router.patch(
  '/:id/disable',
  auditLog('DISABLE_STAFF', 'Staff'),
  asyncHandler(async (req, res) => {
    const staff = await staffService.disable(req.params.id);
    sendSuccess(res, staff);
  })
);

router.patch(
  '/:id/enable',
  auditLog('ENABLE_STAFF', 'Staff'),
  asyncHandler(async (req, res) => {
    const staff = await staffService.enable(req.params.id);
    sendSuccess(res, staff);
  })
);

export default router;
