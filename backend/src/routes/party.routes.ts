import { Router } from 'express';
import { z } from 'zod';
import { PartyType } from '../types/enums';
import { normalizePartyPayload, partyDetailsSchema } from '../lib/party-fields';
import { authenticate, adminOnly, AuthRequest } from '../middleware/auth';
import { requireBusiness, BusinessRequest } from '../middleware/business';
import { auditLog } from '../middleware/auditLog';
import { partyService } from '../services/party.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(requireBusiness);

router.get(
  '/',
  asyncHandler(async (req: BusinessRequest, res) => {
    const type = req.query.type as PartyType | undefined;
    const parties = await partyService.list(req.businessId!, type);
    sendSuccess(res, parties);
  })
);

const partyUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  type: z.nativeEnum(PartyType).optional(),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')).nullable(),
  phone: z.string().trim().nullable().optional(),
  promotionSource: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  emergencyContactName: z.string().trim().nullable().optional(),
  emergencyContactPhone: z.string().trim().nullable().optional(),
  emergencyContactRelation: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

function normalizeOptionalPartyFields(data: z.infer<typeof partyUpdateSchema>) {
  const out: Record<string, string | null | undefined> = {};
  if (data.email !== undefined) out.email = data.email?.trim() || null;
  if (data.phone !== undefined) out.phone = data.phone?.trim() || null;
  if (data.promotionSource !== undefined) out.promotionSource = data.promotionSource?.trim() || null;
  if (data.address !== undefined) out.address = data.address?.trim() || null;
  if (data.emergencyContactName !== undefined) out.emergencyContactName = data.emergencyContactName?.trim() || null;
  if (data.emergencyContactPhone !== undefined) out.emergencyContactPhone = data.emergencyContactPhone?.trim() || null;
  if (data.emergencyContactRelation !== undefined) {
    out.emergencyContactRelation = data.emergencyContactRelation?.trim() || null;
  }
  if (data.notes !== undefined) out.notes = data.notes?.trim() || null;
  return out;
}

router.post(
  '/',
  auditLog('CREATE_PARTY', 'Party'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const data = partyDetailsSchema.parse(req.body);
    const party = await partyService.create({
      ...normalizePartyPayload(data),
      businessId: req.businessId!,
      type: data.type as PartyType,
    });
    sendSuccess(res, party, 201);
  })
);

router.put(
  '/:id',
  auditLog('UPDATE_PARTY', 'Party'),
  asyncHandler(async (req: AuthRequest & BusinessRequest, res) => {
    const data = partyUpdateSchema.parse(req.body);
    const { isActive, name, type, ...optionalFields } = data;
    const updateData = {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...normalizeOptionalPartyFields({ ...optionalFields, name, type, isActive }),
      ...(req.user?.role === 'ADMIN' && isActive !== undefined ? { isActive } : {}),
    };

    const party = await partyService.update(req.businessId!, String(req.params.id), updateData);
    sendSuccess(res, party);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_PARTY', 'Party'),
  asyncHandler(async (req: BusinessRequest, res) => {
    const party = await partyService.delete(req.businessId!, String(req.params.id));
    sendSuccess(res, party);
  })
);

export default router;
