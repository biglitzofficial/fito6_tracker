import { Router } from 'express';
import { z } from 'zod';
import { PartyType } from '../types/enums';
import { authenticate, adminOnly, AuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { partyService } from '../services/party.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = req.query.type as PartyType | undefined;
    const parties = await partyService.list(type);
    sendSuccess(res, parties);
  })
);

router.post(
  '/',
  auditLog('CREATE_PARTY', 'Party'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2, 'Party name must be at least 2 characters'),
        type: z.nativeEnum(PartyType).default(PartyType.STAFF),
        phone: z.string().trim().optional(),
        notes: z.string().trim().optional(),
      })
      .parse(req.body);
    const party = await partyService.create(data);
    sendSuccess(res, party, 201);
  })
);

router.put(
  '/:id',
  auditLog('UPDATE_PARTY', 'Party'),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).optional(),
        type: z.nativeEnum(PartyType).optional(),
        phone: z.string().trim().nullable().optional(),
        notes: z.string().trim().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const { isActive, ...rest } = data;
    const updateData =
      req.user?.role === 'ADMIN' && isActive !== undefined ? data : rest;

    const party = await partyService.update(String(req.params.id), updateData);
    sendSuccess(res, party);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_PARTY', 'Party'),
  asyncHandler(async (req, res) => {
    const party = await partyService.delete(req.params.id);
    sendSuccess(res, party);
  })
);

export default router;
