import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { ledgerService, LedgerType } from '../services/ledger.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await ledgerService.getLedger({
      search: req.query.search as string,
      type: (req.query.type as LedgerType) || 'ALL',
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    });
    sendSuccess(res, result);
  })
);

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const csv = await ledgerService.exportCsv({
      search: req.query.search as string,
      type: (req.query.type as LedgerType) || 'ALL',
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });
    sendSuccess(res, { content: csv, filename: `ledger_${new Date().toISOString().split('T')[0]}.csv` });
  })
);

export default router;
