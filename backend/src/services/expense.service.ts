import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

interface ExpenseFilters {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
}

export const expenseService = {
  async list(filters: ExpenseFilters) {
    const { search, categoryId, dateFrom, dateTo, isRecurring, page = 1, limit = 20 } = filters;
    const where: Prisma.ExpenseWhereInput = {};

    if (categoryId) where.categoryId = categoryId;
    if (isRecurring !== undefined) where.isRecurring = isRecurring;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { vendor: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true, createdBy: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { category: true, createdBy: { select: { id: true, name: true } } },
    });
    if (!expense) throw new AppError(404, 'Expense record not found');
    return expense;
  },

  async create(data: {
    amount: number;
    categoryId: string;
    vendor?: string;
    date: string;
    notes?: string;
    attachment?: string;
    isRecurring?: boolean;
    recurringDay?: number;
    createdById: string;
  }) {
    return prisma.expense.create({
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        vendor: data.vendor,
        date: new Date(data.date),
        notes: data.notes,
        attachment: data.attachment,
        isRecurring: data.isRecurring || false,
        recurringDay: data.recurringDay,
        createdById: data.createdById,
      },
      include: { category: true },
    });
  },

  async update(id: string, data: Partial<{
    amount: number;
    categoryId: string;
    vendor: string;
    date: string;
    notes: string;
    attachment: string;
    isRecurring: boolean;
    recurringDay: number;
  }>) {
    await expenseService.getById(id);
    return prisma.expense.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true },
    });
  },

  async delete(id: string) {
    await expenseService.getById(id);
    await prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted' };
  },
};
