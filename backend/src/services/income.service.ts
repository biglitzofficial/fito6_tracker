import { Income, Party } from '../types/models';
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
import { nextIncomeReceiptNumber } from '../lib/receipt-number';
import { AppError } from '../utils/response';

interface IncomeFilters {
  search?: string;
  categoryId?: string;
  partyId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
  page?: number;
  limit?: number;
}

async function withRelations(items: Income[]) {
  const categoryMap = await getCategoryMap(items.map((i) => i.categoryId));
  const accountMap = await getAccountMap(items.map((i) => i.accountId || ''));
  const partyMap = await getPartyMap(items.map((i) => i.partyId || ''));
  const userMap = await getUserMap([
    ...items.map((i) => i.createdById),
    ...items.map((i) => i.creditedToId || ''),
  ]);

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
    party: item.partyId
      ? partyMap.get(item.partyId) ?? {
          id: item.partyId,
          name: item.source || 'Unknown',
          type: 'CUSTOMER' as const,
        }
      : null,
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
    creditedTo: item.creditedToId
      ? {
          id: item.creditedToId,
          name: userMap.get(item.creditedToId)?.name || 'Unknown',
        }
      : null,
  }));
}

async function resolvePartyFields(
  businessId: string,
  data: { partyId?: string; source?: string }
) {
  if (!data.partyId) {
    return { partyId: null as string | null, source: data.source?.trim() || null };
  }

  const party = assertBusinessAccess(
    await getById<Party>(COL.parties, data.partyId),
    businessId,
    'Party'
  );
  if (!party.isActive) {
    throw new AppError(400, 'Invalid party selected');
  }

  return { partyId: party.id, source: party.name };
}

export const incomeService = {
  async list(businessId: string, filters: IncomeFilters) {
    const { search, categoryId, partyId, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    let items = await findManyForBusiness<Income>(COL.income, businessId, (item) => {
      if (filters.createdById && item.createdById !== filters.createdById) return false;
      if (categoryId && item.categoryId !== categoryId) return false;
      if (partyId && item.partyId !== partyId) return false;
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
    partyId?: string;
    source?: string;
    creditedToId?: string;
    date: string;
    notes?: string;
    attachment?: string;
    createdById: string;
  }) {
    const entryDate = new Date(data.date);
    const receiptNumber = await nextIncomeReceiptNumber(data.businessId, entryDate);
    const { partyId, source } = await resolvePartyFields(data.businessId, data);
    const income = await create<Income>(COL.income, {
      businessId: data.businessId,
      receiptNumber,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId || null,
      partyId,
      source,
      creditedToId: data.creditedToId || null,
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
      partyId: string | null;
      source: string;
      creditedToId: string | null;
      date: string;
      notes: string;
      attachment: string;
    }>
  ) {
    await incomeService.getById(businessId, id);
    const updatePayload: Partial<Income> = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    };

    if (data.partyId !== undefined || data.source !== undefined) {
      const resolved = await resolvePartyFields(businessId, {
        partyId: data.partyId ?? undefined,
        source: data.source,
      });
      updatePayload.partyId = resolved.partyId;
      updatePayload.source = resolved.source;
    }

    const income = await update<Income>(COL.income, id, updatePayload);
    return (await withRelations([income]))[0];
  },

  async delete(businessId: string, id: string) {
    await incomeService.getById(businessId, id);
    await remove(COL.income, id);
    return { message: 'Income deleted' };
  },
};
