import { Router } from 'express';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { attendanceService } from '../services/attendance.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.post(
  '/check-in',
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await attendanceService.checkIn(req.user!.userId);
    sendSuccess(res, result, 201);
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await attendanceService.checkOut(req.user!.userId);
    sendSuccess(res, result);
  })
);

router.get(
  '/today',
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await attendanceService.getTodayStatus(req.user!.userId);
    sendSuccess(res, result);
  })
);

router.get(
  '/history',
  asyncHandler(async (req: AuthRequest, res) => {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const userId = req.user!.role === 'ADMIN' && req.query.userId
      ? (req.query.userId as string)
      : req.user!.userId;
    const result = await attendanceService.getHistory(userId, month, year);
    sendSuccess(res, result);
  })
);

router.get(
  '/report',
  adminOnly,
  asyncHandler(async (req, res) => {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const result = await attendanceService.getMonthlyReport(month, year);
    sendSuccess(res, result);
  })
);

export default router;
