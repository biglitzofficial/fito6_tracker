import { Income } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
  getById,
  getAccountMap,
  getCategoryMap,
  getUserMap,
  inDateRange,
  matchesSearch,
  paginate,
  remove,
  sortBy,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { nextIncomeReceiptNumber } from '../lib/receipt-number';

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
  const accountMap = await getAccountMap(items.map((i) => i.accountId || ''));
  const userMap = await getUserMap(items.map((i) => i.createdById));

  return items.map((item) => ({
    ...item,
    amount: Number(item.amount),
    category: categoryMap.get(item.categoryId) ?? {
      id: item.categoryId,
      name: 'Unknown',
      type: 'INCOME' as const,
    },
    account: item.accountId
      ? accountMap.get(item.accountId) ?? {
          id: item.accountId,
          name: 'Unknown',
          type: 'OTHER' as const,
        }
      : null,
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
  }));
}

export const incomeService = {
  async list(businessId: string, filters: IncomeFilters) {
    const { search, categoryId, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    let items = await findManyForBusiness<Income>(COL.income, businessId, (item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (!inDateRange(item.date, from, to)) return false;
      if (!matchesSearch(search, item.receiptNumber, item.source, item.notes)) return false;
      return true;
    });

    items = sortBy(items, 'date', 'desc');
    const paged = paginate(items, page, limit);
    return { ...paged, items: await withRelations(paged.items) };
  },

  async getById(businessId: string, id: string) {
    const income = assertBusinessAccess(await getById<Income>(COL.income, id), businessId, 'Income record');
    return (await withRelations([income]))[0];
  },

  async create(data: {
    businessId: string;
    amount: number;
    categoryId: string;
    accountId?: string;
    source?: string;
    date: string;
    notes?: string;
    attachment?: string;
    createdById: string;
  }) {
    const entryDate = new Date(data.date);
    const receiptNumber = await nextIncomeReceiptNumber(data.businessId, entryDate);
    const income = await create<Income>(COL.income, {
      businessId: data.businessId,
      receiptNumber,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId || null,
      source: data.source,
      date: entryDate,
      notes: data.notes,
      attachment: data.attachment,
      createdById: data.createdById,
    });
    return (await withRelations([income]))[0];
  },

  async update(
    businessId: string,
    id: string,
    data: Partial<{
      amount: number;
      categoryId: string;
      accountId: string | null;
      source: string;
      date: string;
      notes: string;
      attachment: string;
    }>
  ) {
    await incomeService.getById(businessId, id);
    const income = await update<Income>(COL.income, id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    });
    return (await withRelations([income]))[0];
  },

  async delete(businessId: string, id: string) {
    await incomeService.getById(businessId, id);
    await remove(COL.income, id);
    return { message: 'Income deleted' };
  },
};
