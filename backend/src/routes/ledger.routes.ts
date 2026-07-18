import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { ledgerService, LedgerType } from '../services/ledger.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);
router.use(adminOnly);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const result = await ledgerService.getLedger(req.businessId!, {
      search: req.query.search as string,
      type: (req.query.type as LedgerType) || 'ALL',
      partyId: req.query.partyId as string | undefined,
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
  asyncHandler(async (req: BusinessRequest, res) => {
    const csv = await ledgerService.exportCsv(req.businessId!, {
      search: req.query.search as string,
      type: (req.query.type as LedgerType) || 'ALL',
      partyId: req.query.partyId as string | undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });
    sendSuccess(res, { content: csv, filename: `ledger_${new Date().toISOString().split('T')[0]}.csv` });
  })
);

export default router;
