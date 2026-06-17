import { Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

interface IncomeFilters {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const incomeService = {
  async list(filters: IncomeFilters) {
    const { search, categoryId, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const where: Prisma.IncomeWhereInput = {};

    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { source: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: { category: true, createdBy: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.income.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const income = await prisma.income.findUnique({
      where: { id },
      include: { category: true, createdBy: { select: { id: true, name: true } } },
    });
    if (!income) throw new AppError(404, 'Income record not found');
    return income;
  },

  async create(data: {
    amount: number;
    categoryId: string;
    source?: string;
    date: string;
    notes?: string;
    attachment?: string;
    createdById: string;
  }) {
    return prisma.income.create({
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        source: data.source,
        date: new Date(data.date),
        notes: data.notes,
        attachment: data.attachment,
        createdById: data.createdById,
      },
      include: { category: true },
    });
  },

  async update(id: string, data: Partial<{
    amount: number;
    categoryId: string;
    source: string;
    date: string;
    notes: string;
    attachment: string;
  }>) {
    await incomeService.getById(id);
    return prisma.income.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true },
    });
  },

  async delete(id: string) {
    await incomeService.getById(id);
    await prisma.income.delete({ where: { id } });
    return { message: 'Income deleted' };
  },
};
