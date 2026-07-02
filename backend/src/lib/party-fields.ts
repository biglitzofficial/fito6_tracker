import { z } from 'zod';

export const partyDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Party name must be at least 2 characters'),
  type: z.enum(['STAFF', 'VENDOR', 'CUSTOMER', 'OTHER']),
  email: z.union([z.string().trim().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  promotionSource: z.string().trim().optional(),
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
    promotionSource: data.promotionSource?.trim() || null,
    address: data.address?.trim() || null,
    emergencyContactName: data.emergencyContactName?.trim() || null,
    emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
    emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}
