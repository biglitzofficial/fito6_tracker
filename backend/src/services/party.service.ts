import { PartyType } from '../types/enums';
import { Party } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
  getById,
  sortBy,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { AppError } from '../utils/response';

export const partyService = {
  async list(businessId: string, type?: PartyType) {
    const parties = await findManyForBusiness<Party>(
      COL.parties,
      businessId,
      (p) => p.isActive && (!type || p.type === type)
    );
    return sortBy(parties, 'name', 'asc');
  },

  async getById(businessId: string, id: string) {
    return assertBusinessAccess(await getById<Party>(COL.parties, id), businessId, 'Party');
  },

  async create(data: {
    businessId: string;
    name: string;
    type: PartyType;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    promotionSource?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    notes?: string | null;
  }) {
    const name = data.name.trim();
    const existing = (await findManyForBusiness<Party>(COL.parties, data.businessId)).find(
      (p) => p.isActive && p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    return create<Party>(COL.parties, {
      businessId: data.businessId,
      name,
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
      isActive: true,
    });
  },

  async update(
    businessId: string,
    id: string,
    data: {
      name?: string;
      type?: PartyType;
      email?: string | null;
      phone?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      promotionSource?: string | null;
      address?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      emergencyContactRelation?: string | null;
      notes?: string | null;
      isActive?: boolean;
    }
  ) {
    assertBusinessAccess(await getById<Party>(COL.parties, id), businessId, 'Party');

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length < 2) throw new AppError(400, 'Party name must be at least 2 characters');
      const duplicate = (await findManyForBusiness<Party>(COL.parties, businessId)).find(
        (p) => p.id !== id && p.isActive && p.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) throw new AppError(409, 'Party already exists');
      data.name = name;
    }

    const nullable = (value: string | null | undefined) =>
      value === undefined ? undefined : value?.trim() || null;

    return update<Party>(COL.parties, id, {
      ...data,
      email: nullable(data.email),
      phone: nullable(data.phone),
      dateOfBirth: nullable(data.dateOfBirth),
      gender: nullable(data.gender),
      promotionSource: nullable(data.promotionSource),
      address: nullable(data.address),
      emergencyContactName: nullable(data.emergencyContactName),
      emergencyContactPhone: nullable(data.emergencyContactPhone),
      emergencyContactRelation: nullable(data.emergencyContactRelation),
      notes: nullable(data.notes),
    });
  },

  async delete(businessId: string, id: string) {
    assertBusinessAccess(await getById<Party>(COL.parties, id), businessId, 'Party');
    return update<Party>(COL.parties, id, { isActive: false });
  },
};
