import { AuditLog, Setting, User } from '../types/models';
import {
  COL,
  create,
  findMany,
  findManyForBusiness,
  findOne,
  getUserMap,
  paginate,
  sortBy,
  update,
} from '../lib/firestore';

export const auditService = {
  async list(filters: { page?: number; limit?: number; userId?: string }) {
    const { page = 1, limit = 50, userId } = filters;

    let items = await findMany<AuditLog>(COL.auditLogs, (log) => !userId || log.userId === userId);
    items = sortBy(items, 'createdAt', 'desc');
    const paged = paginate(items, page, limit);
    const userMap = await getUserMap(paged.items.map((i) => i.userId).filter(Boolean) as string[]);

    return {
      ...paged,
      items: paged.items.map((log) => ({
        ...log,
        user: log.userId
          ? {
              id: log.userId,
              name: userMap.get(log.userId)?.name || 'Unknown',
              email: userMap.get(log.userId)?.email || '',
              role: (userMap.get(log.userId) as User | undefined)?.role,
            }
          : null,
      })),
    };
  },
};

export const settingsService = {
  scopedKey(key: string, businessId?: string) {
    return businessId ? `${businessId}:${key}` : key;
  },

  async get(key: string, businessId?: string) {
    const setting = await findOne<Setting>(COL.settings, 'key', this.scopedKey(key, businessId));
    if (setting) return setting.value ?? null;
    if (businessId) {
      const legacy = await findOne<Setting>(COL.settings, 'key', key);
      return legacy?.value ?? null;
    }
    return null;
  },

  async getAll(businessId?: string) {
    const settings = await findMany<Setting>(COL.settings);
    const prefix = businessId ? `${businessId}:` : null;
    const entries = settings
      .filter((s) => {
        if (!businessId) return !s.key.includes(':');
        return s.key.startsWith(`${businessId}:`);
      })
      .map((s) => [prefix ? s.key.slice(prefix.length) : s.key, s.value] as const);

    if (businessId && entries.length === 0) {
      const legacy = settings.filter((s) => !s.key.includes(':'));
      return Object.fromEntries(legacy.map((s) => [s.key, s.value]));
    }

    return Object.fromEntries(entries);
  },

  async set(key: string, value: unknown, businessId?: string) {
    const fullKey = this.scopedKey(key, businessId);
    const existing = await findOne<Setting>(COL.settings, 'key', fullKey);
    if (existing) {
      return update<Setting>(COL.settings, existing.id, {
        value: value as Record<string, unknown>,
      });
    }
    return create<Setting>(COL.settings, {
      key: fullKey,
      businessId: businessId || null,
      value: value as Record<string, unknown>,
    });
  },

  async exportBackup(businessId: string) {
    const [
      settings,
      categories,
      accounts,
      parties,
      membershipPlans,
      subscriptions,
      income,
      expenses,
      memberAttendance,
    ] = await Promise.all([
      this.getAll(businessId),
      findManyForBusiness(COL.categories, businessId),
      findManyForBusiness(COL.accounts, businessId),
      findManyForBusiness(COL.parties, businessId),
      findManyForBusiness(COL.membershipPlans, businessId),
      findManyForBusiness(COL.subscriptions, businessId),
      findManyForBusiness(COL.income, businessId),
      findManyForBusiness(COL.expenses, businessId),
      findManyForBusiness(COL.memberAttendance, businessId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      businessId,
      settings,
      categories,
      accounts,
      parties,
      membershipPlans,
      subscriptions,
      income,
      expenses,
      memberAttendance,
    };
  },
};
