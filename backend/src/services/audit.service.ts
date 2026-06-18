import { AuditLog, Setting, User } from '../types/models';
import { COL, create, findMany, findOne, getUserMap, paginate, sortBy, update } from '../lib/firestore';

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
  async get(key: string) {
    const setting = await findOne<Setting>(COL.settings, 'key', key);
    return setting?.value ?? null;
  },

  async getAll() {
    const settings = await findMany<Setting>(COL.settings);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  },

  async set(key: string, value: unknown) {
    const existing = await findOne<Setting>(COL.settings, 'key', key);
    if (existing) {
      return update<Setting>(COL.settings, existing.id, { value: value as Record<string, unknown> });
    }
    return create<Setting>(COL.settings, { key, value: value as Record<string, unknown> });
  },
};
