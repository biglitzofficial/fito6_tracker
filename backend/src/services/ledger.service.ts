import { Category, Expense, Income } from '../types/models';
import {
  COL,
  findManyForBusiness,
  getCategoryMap,
  getUserMap,
  inDateRange,
  matchesSearch,
  paginate,
  sortBy,
  sumAmounts,
} from '../lib/firestore';

export type LedgerType = 'INCOME' | 'EXPENSE' | 'ALL';

export interface LedgerFilters {
  search?: string;
  type?: LedgerType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface LedgerEntry {
  id: string;
  referenceId: string;
  receiptNumber?: string | null;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category: string;
  categoryId: string;
  debit: number;
  credit: number;
  balance: number;
  createdBy: string;
}

export const ledgerService = {
  async getLedger(businessId: string, filters: LedgerFilters) {
    const { search, type = 'ALL', dateFrom, dateTo, page = 1, limit = 50 } = filters;

    const dateToEnd = dateTo ? new Date(dateTo) : undefined;
    if (dateToEnd) dateToEnd.setHours(23, 59, 59, 999);
    const dateFromStart = dateFrom ? new Date(dateFrom) : undefined;
    if (dateFromStart) dateFromStart.setHours(0, 0, 0, 0);

    let openingBalance = 0;
    if (dateFromStart) {
      const [incomes, expenses] = await Promise.all([
        findManyForBusiness<Income>(COL.income, businessId, (i) => i.date < dateFromStart),
        findManyForBusiness<Expense>(COL.expenses, businessId, (e) => e.date < dateFromStart),
      ]);
      openingBalance = sumAmounts(incomes) - sumAmounts(expenses);
    }

    const [incomes, expenses] = await Promise.all([
      type !== 'EXPENSE'
        ? findManyForBusiness<Income>(COL.income, businessId)
        : Promise.resolve([] as Income[]),
      type !== 'INCOME'
        ? findManyForBusiness<Expense>(COL.expenses, businessId)
        : Promise.resolve([] as Expense[]),
    ]);

    const allCategoryIds = [...incomes.map((i) => i.categoryId), ...expenses.map((e) => e.categoryId)];
    const allUserIds = [...incomes.map((i) => i.createdById), ...expenses.map((e) => e.createdById)];
    const [cats, users] = await Promise.all([getCategoryMap(allCategoryIds), getUserMap(allUserIds)]);

    const filteredIncomes = incomes.filter((i) => {
      if (dateFromStart || dateToEnd) {
        if (!inDateRange(i.date, dateFromStart, dateToEnd)) return false;
      }
      const cat = cats.get(i.categoryId) as Category | undefined;
      if (!matchesSearch(search, i.receiptNumber, i.source, i.notes, cat?.name)) return false;
      return true;
    });

    const filteredExpenses = expenses.filter((e) => {
      if (dateFromStart || dateToEnd) {
        if (!inDateRange(e.date, dateFromStart, dateToEnd)) return false;
      }
      const cat = cats.get(e.categoryId) as Category | undefined;
      if (!matchesSearch(search, e.vendor, e.notes, cat?.name)) return false;
      return true;
    });

    const rawEntries: Omit<LedgerEntry, 'balance'>[] = [
      ...filteredIncomes.map((i) => ({
        id: `income-${i.id}`,
        referenceId: i.id,
        receiptNumber: i.receiptNumber,
        date: i.date.toISOString(),
        type: 'INCOME' as const,
        description: i.source || i.notes || cats.get(i.categoryId)?.name || '',
        category: cats.get(i.categoryId)?.name || 'Unknown',
        categoryId: i.categoryId,
        debit: 0,
        credit: Number(i.amount),
        createdBy: users.get(i.createdById)?.name || 'Unknown',
      })),
      ...filteredExpenses.map((e) => ({
        id: `expense-${e.id}`,
        referenceId: e.id,
        date: e.date.toISOString(),
        type: 'EXPENSE' as const,
        description: e.vendor || e.notes || cats.get(e.categoryId)?.name || '',
        category: cats.get(e.categoryId)?.name || 'Unknown',
        categoryId: e.categoryId,
        debit: Number(e.amount),
        credit: 0,
        createdBy: users.get(e.createdById)?.name || 'Unknown',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = openingBalance;
    const withBalance: LedgerEntry[] = rawEntries.map((entry) => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance };
    });

    const totalIncome = rawEntries.reduce((s, e) => s + e.credit, 0);
    const totalExpense = rawEntries.reduce((s, e) => s + e.debit, 0);
    const closingBalance = openingBalance + totalIncome - totalExpense;

    const paged = paginate(withBalance, page, limit);

    return {
      entries: paged.items,
      summary: {
        openingBalance,
        totalIncome,
        totalExpense,
        netMovement: totalIncome - totalExpense,
        closingBalance,
      },
      total: paged.total,
      page,
      limit,
      totalPages: paged.totalPages,
    };
  },

  async exportCsv(businessId: string, filters: LedgerFilters) {
    const { entries, summary } = await ledgerService.getLedger(businessId, {
      ...filters,
      page: 1,
      limit: 100000,
    });
    const lines = [
      'Date,Type,Receipt No,Description,Category,Debit,Credit,Balance,Created By',
      ...entries.map((e) =>
        [
          e.date.split('T')[0],
          e.type,
          JSON.stringify(e.receiptNumber || ''),
          JSON.stringify(e.description),
          JSON.stringify(e.category),
          e.debit,
          e.credit,
          e.balance,
          JSON.stringify(e.createdBy),
        ].join(',')
      ),
      '',
      `Opening Balance,,,,,${summary.openingBalance}`,
      `Total Income,,,,,${summary.totalIncome}`,
      `Total Expense,,,,${summary.totalExpense},`,
      `Closing Balance,,,,,${summary.closingBalance}`,
    ];
    return lines.join('\n');
  },
};
