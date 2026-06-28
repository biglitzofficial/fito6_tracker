import { PartyType } from '../types/enums';
import { Party } from '../types/models';
import { COL, create, findMany, getById, sortBy, update } from '../lib/firestore';
import { AppError } from '../utils/response';

export const partyService = {
  async list(type?: PartyType) {
    const parties = await findMany<Party>(
      COL.parties,
      (p) => p.isActive && (!type || p.type === type)
    );
    return sortBy(parties, 'name', 'asc');
  },

  async create(data: { name: string; type: PartyType; phone?: string; notes?: string }) {
    const name = data.name.trim();
    const existing = (await findMany<Party>(COL.parties)).find(
      (p) => p.isActive && p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    return create<Party>(COL.parties, {
      name,
      type: data.type,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      isActive: true,
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      type?: PartyType;
      phone?: string | null;
      notes?: string | null;
      isActive?: boolean;
    }
  ) {
    const party = await getById<Party>(COL.parties, id);
    if (!party) throw new AppError(404, 'Party not found');

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length < 2) throw new AppError(400, 'Party name must be at least 2 characters');
      const duplicate = (await findMany<Party>(COL.parties)).find(
        (p) => p.id !== id && p.isActive && p.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) throw new AppError(409, 'Party already exists');
      data.name = name;
    }

    return update<Party>(COL.parties, id, {
      ...data,
      phone: data.phone === undefined ? undefined : data.phone?.trim() || null,
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    });
  },

  async delete(id: string) {
    const party = await getById<Party>(COL.parties, id);
    if (!party) throw new AppError(404, 'Party not found');
    return update<Party>(COL.parties, id, { isActive: false });
  },
};
