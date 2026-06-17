import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
    const data = await analyticsService.getRevenueAnalytics({
      period,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    sendSuccess(res, data);
  })
);

router.get(
  '/expense',
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getExpenseAnalytics({
      period: (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly',
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    sendSuccess(res, data);
  })
);

router.get(
  '/profit',
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getProfitAnalytics({
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    sendSuccess(res, data);
  })
);

router.get(
  '/cash-flow',
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getCashFlowAnalytics({
      period: (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly',
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    sendSuccess(res, data);
  })
);

export default router;
