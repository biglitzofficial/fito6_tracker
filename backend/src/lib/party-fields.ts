import { z } from 'zod';
import { Party } from '../types/models';
import { COL, getById } from './firestore';
import { assertBusinessAccess } from './business-scope';
import { AppError } from '../utils/response';
import { promotionSourceSchema } from './promotion-sources';
import { genderSchema } from './genders';

export const partyDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Party name must be at least 2 characters'),
  type: z.enum(['STAFF', 'VENDOR', 'CUSTOMER', 'OTHER']),
  email: z.union([z.string().trim().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  gender: genderSchema,
  promotionSource: promotionSourceSchema,
  address: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactRelation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PartyDetailsInput = z.infer<typeof partyDetailsSchema>;

export function normalizePartyPayload(data: PartyDetailsInput) {
  return {
    name: data.name.trim(),
    type: data.type,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    dateOfBirth: data.dateOfBirth?.trim() || null,
    gender: data.gender?.trim() || null,
    promotionSource: data.promotionSource?.trim() || null,
    address: data.address?.trim() || null,
    emergencyContactName: data.emergencyContactName?.trim() || null,
    emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
    emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

export async function resolvePartyLink(
  businessId: string,
  partyId?: string
): Promise<{ partyId: string | null; displayName: string | null }> {
  if (!partyId) {
    return { partyId: null, displayName: null };
  }

  const party = assertBusinessAccess(
    await getById<Party>(COL.parties, partyId),
    businessId,
    'Party'
  );
  if (!party.isActive) {
    throw new AppError(400, 'Invalid client selected');
  }

  return { partyId: party.id, displayName: party.name };
}
