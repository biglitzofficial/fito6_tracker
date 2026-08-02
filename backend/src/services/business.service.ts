import { Role } from '../types/enums';
import { Business, BusinessMember } from '../types/models';
import { COL, create, findMany, getById, sortBy, update } from '../lib/firestore';
import { seedBusinessDefaults } from '../lib/business-seed';
import { settingsService } from './audit.service';
import { AppError } from '../utils/response';

const SCOPED_COLLECTIONS = [
  COL.income,
  COL.expenses,
  COL.categories,
  COL.accounts,
  COL.parties,
] as const;

async function backfillBusinessId(businessId: string) {
  for (const collection of SCOPED_COLLECTIONS) {
    const items = await findMany<{ businessId?: string | null }>(collection, (item) => !item.businessId);
    await Promise.all(
      items.map((item) => update(collection, item.id, { businessId }))
    );
  }
}

async function getLegacyBusinessName() {
  const legacy = await settingsService.get('business_name');
  const name = (legacy as { name?: string } | null)?.name;
  return name?.trim() || 'Fito6';
}

export const businessService = {
  async getMembership(userId: string, businessId: string) {
    const members = await findMany<BusinessMember>(
      COL.businessMembers,
      (m) => m.userId === userId && m.businessId === businessId && m.isActive
    );
    return members[0] ?? null;
  },

  async listForUser(userId: string, userRole: Role) {
    if (userRole === Role.SUPERADMIN) {
      return sortBy(await findMany<Business>(COL.businesses, () => true), 'name');
    }

    let memberships = await findMany<BusinessMember>(
      COL.businessMembers,
      (m) => m.userId === userId && m.isActive
    );

    if (!memberships.length) {
      const business = await this.createBusiness(userId, userRole, await getLegacyBusinessName());
      return [business];
    }

    const businesses = await Promise.all(
      memberships.map((m) => getById<Business>(COL.businesses, m.businessId))
    );

    return businesses.filter(Boolean) as Business[];
  },

  async createBusiness(userId: string, userRole: Role, name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new AppError(400, 'Business name must be at least 2 characters');
    }

    const existingCount = (await findMany<BusinessMember>(
      COL.businessMembers,
      (m) => m.userId === userId && m.isActive
    )).length;

    const business = await create<Business>(COL.businesses, {
      name: trimmed,
      createdById: userId,
    });

    await create<BusinessMember>(COL.businessMembers, {
      businessId: business.id,
      userId,
      role: userRole,
      isActive: true,
    });

    if (existingCount === 0) {
      await backfillBusinessId(business.id);
    }

    await seedBusinessDefaults(business.id, trimmed);
    return business;
  },

  async getById(id: string) {
    const business = await getById<Business>(COL.businesses, id);
    if (!business) throw new AppError(404, 'Business not found');
    return business;
  },
};
