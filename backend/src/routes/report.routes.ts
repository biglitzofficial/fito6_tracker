import { Router } from 'express';
import { z } from 'zod';
import { ReportFormat } from '../types/enums';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { reportService } from '../services/report.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
  format: z.nativeEnum(ReportFormat).default(ReportFormat.CSV),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.role === 'STAFF' ? req.user!.userId : undefined;
    const reports = await reportService.list(userId);
    sendSuccess(res, reports);
  })
);

router.post(
  '/income',
  adminOnly,
  auditLog('GENERATE_INCOME_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateIncomeReport(dateFrom!, dateTo!, format, req.user!.userId);
    sendSuccess(res, result);
  })
);

router.post(
  '/expense',
  adminOnly,
  auditLog('GENERATE_EXPENSE_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateExpenseReport(dateFrom!, dateTo!, format, req.user!.userId);
    sendSuccess(res, result);
  })
);

router.post(
  '/profit-loss',
  adminOnly,
  auditLog('GENERATE_PL_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateProfitLossReport(dateFrom!, dateTo!, format, req.user!.userId);
    sendSuccess(res, result);
  })
);

router.post(
  '/attendance',
  adminOnly,
  auditLog('GENERATE_ATTENDANCE_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { month, year, format } = generateSchema.parse(req.body);
    const now = new Date();
    const result = await reportService.generateAttendanceReport(
      month ?? now.getMonth(),
      year ?? now.getFullYear(),
      format,
      req.user!.userId
    );
    sendSuccess(res, result);
  })
);

export default router;
