import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { memberAttendanceService } from '../services/member-attendance.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

const checkInSchema = z.object({
  partyId: z.string().min(1),
  notes: z.string().optional(),
});

router.post(
  '/check-in',
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { partyId, notes } = checkInSchema.parse(req.body);
    const result = await memberAttendanceService.checkIn(
      req.businessId!,
      partyId,
      req.user!.userId,
      notes
    );
    sendSuccess(res, result, 201);
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { partyId } = z.object({ partyId: z.string().min(1) }).parse(req.body);
    const result = await memberAttendanceService.checkOut(req.businessId!, partyId);
    sendSuccess(res, result);
  })
);

router.get(
  '/today',
  asyncHandler(async (req: BusinessRequest, res) => {
    const result = await memberAttendanceService.listToday(req.businessId!);
    sendSuccess(res, result);
  })
);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const result = await memberAttendanceService.listByDate(
      req.businessId!,
      req.query.dateFrom as string | undefined,
      req.query.dateTo as string | undefined
    );
    sendSuccess(res, result);
  })
);

export default router;
