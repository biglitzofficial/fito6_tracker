import { Expense, Party } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
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
import { assertBusinessAccess } from '../lib/business-scope';
import { nextExpenseVoucherNumber } from '../lib/receipt-number';
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

async function resolvePartyFields(
  businessId: string,
  data: { partyId?: string; vendor?: string }
) {
  if (!data.partyId) {
    return { partyId: null as string | null, vendor: data.vendor?.trim() || null };
  }

  const party = assertBusinessAccess(
    await getById<Party>(COL.parties, data.partyId),
    businessId,
    'Party'
  );
  if (!party.isActive) {
    throw new AppError(400, 'Invalid party selected');
  }

  return { partyId: party.id, vendor: party.name };
}

export const expenseService = {
  async list(businessId: string, filters: ExpenseFilters) {
    const { search, categoryId, dateFrom, dateTo, isRecurring, page = 1, limit = 20 } = filters;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    let items = await findManyForBusiness<Expense>(COL.expenses, businessId, (item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (isRecurring !== undefined && item.isRecurring !== isRecurring) return false;
      if (!inDateRange(item.date, from, to)) return false;
      if (!matchesSearch(search, item.voucherNumber, item.vendor, item.notes)) return false;
      return true;
    });

    items = sortBy(items, 'date', 'desc');
    const paged = paginate(items, page, limit);
    return { ...paged, items: await withRelations(paged.items) };
  },

  async getById(businessId: string, id: string) {
    const expense = assertBusinessAccess(
      await getById<Expense>(COL.expenses, id),
      businessId,
      'Expense record'
    );
    return (await withRelations([expense]))[0];
  },

  async create(data: {
    businessId: string;
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
    const entryDate = new Date(data.date);
    const voucherNumber = await nextExpenseVoucherNumber(data.businessId, entryDate);
    const periodMonth =
      data.periodMonth && isValidPeriodMonth(data.periodMonth)
        ? data.periodMonth
        : periodMonthFromDate(data.date);
    const { partyId, vendor } = await resolvePartyFields(data.businessId, data);

    const expense = await create<Expense>(COL.expenses, {
      businessId: data.businessId,
      voucherNumber,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId || null,
      partyId,
      vendor,
      date: entryDate,
      periodMonth,
      notes: data.notes,
      attachment: data.attachment,
      isRecurring: data.isRecurring || false,
      recurringDay: data.isRecurring ? data.recurringDay : undefined,
      createdById: data.createdById,
    });
    return (await withRelations([expense]))[0];
  },

  async update(
    businessId: string,
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
    await expenseService.getById(businessId, id);
    const updatePayload: Partial<Expense> = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    };

    if (data.partyId !== undefined || data.vendor !== undefined) {
      const resolved = await resolvePartyFields(businessId, {
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
    if (data.isRecurring === false) {
      updatePayload.isRecurring = false;
      updatePayload.recurringDay = undefined;
    } else if (data.isRecurring) {
      updatePayload.isRecurring = true;
      updatePayload.recurringDay = data.recurringDay;
    }
    const expense = await update<Expense>(COL.expenses, id, updatePayload);
    return (await withRelations([expense]))[0];
  },

  async delete(businessId: string, id: string) {
    await expenseService.getById(businessId, id);
    await remove(COL.expenses, id);
    return { message: 'Expense deleted' };
  },
};
