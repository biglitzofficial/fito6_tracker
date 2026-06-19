import { Income, Category } from '../types/models';
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

interface IncomeFilters {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

async function withRelations(items: Income[]) {
  const categoryMap = await getCategoryMap(items.map((i) => i.categoryId));
  const userMap = await getUserMap(items.map((i) => i.createdById));

  return items.map((item) => ({
    ...item,
    amount: Number(item.amount),
    category: categoryMap.get(item.categoryId) ?? {
      id: item.categoryId,
      name: 'Unknown',
      type: 'INCOME' as const,
    },
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
  }));
}

export const incomeService = {
  async list(filters: IncomeFilters) {
    const { search, categoryId, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    let items = await findMany<Income>(COL.income, (item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (!inDateRange(item.date, from, to)) return false;
      if (!matchesSearch(search, item.source, item.notes)) return false;
      return true;
    });

    items = sortBy(items, 'date', 'desc');
    const paged = paginate(items, page, limit);
    return { ...paged, items: await withRelations(paged.items) };
  },

  async getById(id: string) {
    const income = await getById<Income>(COL.income, id);
    if (!income) throw new AppError(404, 'Income record not found');
    return (await withRelations([income]))[0];
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
    const income = await create<Income>(COL.income, {
      amount: data.amount,
      categoryId: data.categoryId,
      source: data.source,
      date: new Date(data.date),
      notes: data.notes,
      attachment: data.attachment,
      createdById: data.createdById,
    });
    return (await withRelations([income]))[0];
  },

  async update(
    id: string,
    data: Partial<{
      amount: number;
      categoryId: string;
      source: string;
      date: string;
      notes: string;
      attachment: string;
    }>
  ) {
    await incomeService.getById(id);
    const income = await update<Income>(COL.income, id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    });
    return (await withRelations([income]))[0];
  },

  async delete(id: string) {
    await incomeService.getById(id);
    await remove(COL.income, id);
    return { message: 'Income deleted' };
  },
};
