import prisma from '../lib/prisma';

export const auditService = {
  async list(filters: { page?: number; limit?: number; userId?: string }) {
    const { page = 1, limit = 50, userId } = filters;
    const where = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

export const settingsService = {
  async get(key: string) {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  },

  async getAll() {
    const settings = await prisma.setting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  },

  async set(key: string, value: unknown) {
    return prisma.setting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  },
};
