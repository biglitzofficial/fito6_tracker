import { Router } from 'express';
import { z } from 'zod';
import { Role, ReportFormat } from '../types/enums';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { reportService } from '../services/report.service';
import { getStaffAccess } from '../lib/staff-access';
import { AppError, asyncHandler, sendSuccess } from '../utils/response';

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
  requireBusiness,
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    if (req.user!.role === Role.STAFF) {
      const staffAccess = await getStaffAccess(req.businessId!);
      if (staffAccess.hideNetBalanceAndReports) {
        throw new AppError(403, 'Reports are not available for staff');
      }
    }
    const userId = req.user!.role === 'STAFF' ? req.user!.userId : undefined;
    const reports = await reportService.list(req.businessId!, userId);
    sendSuccess(res, reports);
  })
);

router.post(
  '/income',
  requireBusiness,
  adminOnly,
  auditLog('GENERATE_INCOME_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateIncomeReport(
      req.businessId!,
      dateFrom!,
      dateTo!,
      format,
      req.user!.userId
    );
    sendSuccess(res, result);
  })
);

router.post(
  '/expense',
  requireBusiness,
  adminOnly,
  auditLog('GENERATE_EXPENSE_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateExpenseReport(
      req.businessId!,
      dateFrom!,
      dateTo!,
      format,
      req.user!.userId
    );
    sendSuccess(res, result);
  })
);

router.post(
  '/profit-loss',
  requireBusiness,
  adminOnly,
  auditLog('GENERATE_PL_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const { dateFrom, dateTo, format } = generateSchema.parse(req.body);
    const result = await reportService.generateProfitLossReport(
      req.businessId!,
      dateFrom!,
      dateTo!,
      format,
      req.user!.userId
    );
    sendSuccess(res, result);
  })
);

router.post(
  '/transactions',
  requireBusiness,
  adminOnly,
  auditLog('GENERATE_TRANSACTION_REPORT', 'Report'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const body = generateSchema
      .extend({
        groupBy: z
          .enum(['all', 'day', 'party', 'category', 'payment-mode'])
          .default('all'),
      })
      .parse(req.body);
    const result = await reportService.generateTransactionExport(
      req.businessId!,
      body.dateFrom!,
      body.dateTo!,
      body.format,
      body.groupBy,
      req.user!.userId
    );
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
