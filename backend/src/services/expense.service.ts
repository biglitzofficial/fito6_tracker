import { Expense, Party } from '../types/models';
import {
  COL,
  create,
  findMany,
  getById,
  getAccountMap,
  getCategoryMap,
  getPartyMap,
  getUserMap,
  inDateRange,
  matchesSearch,
  paginate,
  remove,
  sortBy,
  update,
} from '../lib/firestore';
import { isValidPeriodMonth, periodMonthFromDate } from '../utils/period';
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
  const accountMap = await getAccountMap(items.map((e) => e.accountId || ''));
  const partyMap = await getPartyMap(items.map((e) => e.partyId || ''));
  const userMap = await getUserMap(items.map((e) => e.createdById));

  return items.map((item) => ({
    ...item,
    amount: Number(item.amount),
    category: categoryMap.get(item.categoryId) ?? {
      id: item.categoryId,
      name: 'Unknown',
      type: 'EXPENSE' as const,
    },
    account: item.accountId
      ? accountMap.get(item.accountId) ?? {
          id: item.accountId,
          name: 'Unknown',
          type: 'OTHER' as const,
        }
      : null,
    party: item.partyId
      ? partyMap.get(item.partyId) ?? {
          id: item.partyId,
          name: item.vendor || 'Unknown',
          type: 'OTHER' as const,
        }
      : null,
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
  }));
}

async function resolvePartyFields(data: { partyId?: string; vendor?: string }) {
  if (!data.partyId) {
    return { partyId: null as string | null, vendor: data.vendor?.trim() || null };
  }

  const party = await getById<Party>(COL.parties, data.partyId);
  if (!party || !party.isActive) {
    throw new AppError(400, 'Invalid party selected');
  }

  return { partyId: party.id, vendor: party.name };
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
    accountId?: string;
    partyId?: string;
    vendor?: string;
    date: string;
    periodMonth?: string;
    notes?: string;
    attachment?: string;
    isRecurring?: boolean;
    recurringDay?: number;
    createdById: string;
  }) {
    const periodMonth =
      data.periodMonth && isValidPeriodMonth(data.periodMonth)
        ? data.periodMonth
        : periodMonthFromDate(data.date);
    const { partyId, vendor } = await resolvePartyFields(data);

    const expense = await create<Expense>(COL.expenses, {
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId || null,
      partyId,
      vendor,
      date: new Date(data.date),
      periodMonth,
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
      accountId: string | null;
      partyId: string | null;
      vendor: string;
      date: string;
      periodMonth: string;
      notes: string;
      attachment: string;
      isRecurring: boolean;
      recurringDay: number;
    }>
  ) {
    await expenseService.getById(id);
    const updatePayload: Partial<Expense> = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    };

    if (data.partyId !== undefined || data.vendor !== undefined) {
      const resolved = await resolvePartyFields({
        partyId: data.partyId ?? undefined,
        vendor: data.vendor,
      });
      updatePayload.partyId = resolved.partyId;
      updatePayload.vendor = resolved.vendor;
    }

    if (data.periodMonth !== undefined) {
      if (!isValidPeriodMonth(data.periodMonth)) {
        throw new AppError(400, 'periodMonth must be in YYYY-MM format');
      }
      updatePayload.periodMonth = data.periodMonth;
    }
    const expense = await update<Expense>(COL.expenses, id, updatePayload);
    return (await withRelations([expense]))[0];
  },

  async delete(id: string) {
    await expenseService.getById(id);
    await remove(COL.expenses, id);
    return { message: 'Expense deleted' };
  },
};
