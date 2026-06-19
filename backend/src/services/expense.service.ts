import { Expense, Category } from '../types/models';
import {
  COL,
  create,
  findMany,
  getById,
  getCategoryMap,
  getUserMap,
  inDateRange,
  matchesSearch,
  paginate,
  remove,
  sortBy,
  update,
} from '../lib/firestore';
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

async function withRelations(items: Expense[]) {
  const categoryMap = await getCategoryMap(items.map((e) => e.categoryId));
  const userMap = await getUserMap(items.map((e) => e.createdById));

  return items.map((item) => ({
    ...item,
    amount: Number(item.amount),
    category: categoryMap.get(item.categoryId) ?? {
      id: item.categoryId,
      name: 'Unknown',
      type: 'EXPENSE' as const,
    },
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
  }));
}

export const expenseService = {
  async list(filters: ExpenseFilters) {
    const { search, categoryId, dateFrom, dateTo, isRecurring, page = 1, limit = 20 } = filters;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    let items = await findMany<Expense>(COL.expenses, (item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (isRecurring !== undefined && item.isRecurring !== isRecurring) return false;
      if (!inDateRange(item.date, from, to)) return false;
      if (!matchesSearch(search, item.vendor, item.notes)) return false;
      return true;
    });

    items = sortBy(items, 'date', 'desc');
    const paged = paginate(items, page, limit);
    return { ...paged, items: await withRelations(paged.items) };
  },

  async getById(id: string) {
    const expense = await getById<Expense>(COL.expenses, id);
    if (!expense) throw new AppError(404, 'Expense record not found');
    return (await withRelations([expense]))[0];
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
    const expense = await create<Expense>(COL.expenses, {
      amount: data.amount,
      categoryId: data.categoryId,
      vendor: data.vendor,
      date: new Date(data.date),
      notes: data.notes,
      attachment: data.attachment,
      isRecurring: data.isRecurring || false,
      recurringDay: data.recurringDay,
      createdById: data.createdById,
    });
    return (await withRelations([expense]))[0];
  },

  async update(
    id: string,
    data: Partial<{
      amount: number;
      categoryId: string;
      vendor: string;
      date: string;
      notes: string;
      attachment: string;
      isRecurring: boolean;
      recurringDay: number;
    }>
  ) {
    await expenseService.getById(id);
    const expense = await update<Expense>(COL.expenses, id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    });
    return (await withRelations([expense]))[0];
  },

  async delete(id: string) {
    await expenseService.getById(id);
    await remove(COL.expenses, id);
    return { message: 'Expense deleted' };
  },
};
