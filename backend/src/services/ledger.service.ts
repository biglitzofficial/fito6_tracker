import prisma from '../lib/prisma';

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
  async getLedger(filters: LedgerFilters) {
    const { search, type = 'ALL', dateFrom, dateTo, page = 1, limit = 50 } = filters;

    const dateToEnd = dateTo ? new Date(dateTo) : undefined;
    if (dateToEnd) dateToEnd.setHours(23, 59, 59, 999);

    const rangeFilter = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateToEnd ? { lte: dateToEnd } : {}),
    };
    const hasRange = dateFrom || dateTo;

    let openingBalance = 0;
    if (hasRange && dateFrom) {
      const before = new Date(dateFrom);
      before.setHours(0, 0, 0, 0);
      const [incomeBefore, expenseBefore] = await Promise.all([
        prisma.income.aggregate({ where: { date: { lt: before } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { lt: before } }, _sum: { amount: true } }),
      ]);
      openingBalance = Number(incomeBefore._sum.amount || 0) - Number(expenseBefore._sum.amount || 0);
    }

    const incomeWhere: Record<string, unknown> = {};
    const expenseWhere: Record<string, unknown> = {};
    if (hasRange) {
      incomeWhere.date = rangeFilter;
      expenseWhere.date = rangeFilter;
    }
    if (search) {
      incomeWhere.OR = [
        { source: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
      expenseWhere.OR = [
        { vendor: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [incomes, expenses] = await Promise.all([
      type !== 'EXPENSE'
        ? prisma.income.findMany({
            where: incomeWhere,
            include: { category: true, createdBy: { select: { name: true } } },
            orderBy: { date: 'asc' },
          })
        : Promise.resolve([]),
      type !== 'INCOME'
        ? prisma.expense.findMany({
            where: expenseWhere,
            include: { category: true, createdBy: { select: { name: true } } },
            orderBy: { date: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const rawEntries: Omit<LedgerEntry, 'balance'>[] = [
      ...incomes.map((i) => ({
        id: `income-${i.id}`,
        referenceId: i.id,
        date: i.date.toISOString(),
        type: 'INCOME' as const,
        description: i.source || i.notes || i.category.name,
        category: i.category.name,
        categoryId: i.categoryId,
        debit: 0,
        credit: Number(i.amount),
        createdBy: i.createdBy.name,
      })),
      ...expenses.map((e) => ({
        id: `expense-${e.id}`,
        referenceId: e.id,
        date: e.date.toISOString(),
        type: 'EXPENSE' as const,
        description: e.vendor || e.notes || e.category.name,
        category: e.category.name,
        categoryId: e.categoryId,
        debit: Number(e.amount),
        credit: 0,
        createdBy: e.createdBy.name,
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

    const total = withBalance.length;
    const start = (page - 1) * limit;
    const paginated = withBalance.slice(start, start + limit);

    return {
      entries: paginated,
      summary: {
        openingBalance,
        totalIncome,
        totalExpense,
        netMovement: totalIncome - totalExpense,
        closingBalance,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async exportCsv(filters: LedgerFilters) {
    const { entries, summary } = await ledgerService.getLedger({ ...filters, page: 1, limit: 100000 });
    const lines = [
      'Date,Type,Description,Category,Debit,Credit,Balance,Created By',
      ...entries.map((e) =>
        [
          e.date.split('T')[0],
          e.type,
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
