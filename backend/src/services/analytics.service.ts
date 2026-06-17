import prisma from '../lib/prisma';

type Period = 'daily' | 'weekly' | 'monthly';

function getDateRange(input?: { dateFrom?: string; dateTo?: string; period?: Period }) {
  const now = new Date();
  const period = input?.period || 'monthly';

  if (input?.dateFrom) {
    return {
      since: new Date(input.dateFrom),
      until: input.dateTo ? new Date(input.dateTo) : undefined,
      period,
    };
  }

  switch (period) {
    case 'daily':
      return { since: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30), until: undefined, period };
    case 'weekly':
      return { since: new Date(now.getFullYear(), now.getMonth() - 3, 1), until: undefined, period };
    default:
      return { since: new Date(now.getFullYear(), now.getMonth() - 11, 1), until: undefined, period };
  }
}

function dateFilter(since: Date, until?: Date) {
  return until ? { gte: since, lte: until } : { gte: since };
}

function groupKey(date: Date, period: Period): string {
  const d = new Date(date);
  if (period === 'daily') {
    return d.toISOString().split('T')[0];
  }
  if (period === 'weekly') {
    const start = new Date(d);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return start.toISOString().split('T')[0];
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sumByPeriod(
  items: { date: Date; amount: unknown }[],
  period: Period
): { period: string; total: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = groupKey(item.date, period);
    map.set(key, (map.get(key) || 0) + Number(item.amount));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, total }));
}

export const analyticsService = {
  async getRevenueAnalytics(input?: { period?: Period; dateFrom?: string; dateTo?: string }) {
    const { since, until, period } = getDateRange(input);

    const items = await prisma.income.findMany({
      where: { date: dateFilter(since, until) },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const data = sumByPeriod(items, period);
    return { period, data };
  },

  async getExpenseAnalytics(input?: { dateFrom?: string; dateTo?: string; period?: Period }) {
    const { since, until, period } = getDateRange(input);

    const [expenses, byCategory] = await Promise.all([
      prisma.expense.findMany({
        where: { date: dateFilter(since, until) },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { date: dateFilter(since, until) },
        _sum: { amount: true },
      }),
    ]);

    const categories = await prisma.category.findMany({
      where: { id: { in: byCategory.map((c) => c.categoryId) } },
    });

    const categoryBreakdown = byCategory.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categories.find((cat) => cat.id === c.categoryId)?.name || 'Unknown',
      total: Number(c._sum.amount || 0),
    }));

    const monthlyTrends = sumByPeriod(expenses, period).map((d) => ({
      month: d.period,
      total: d.total,
    }));

    return { categoryBreakdown, monthlyTrends };
  },

  async getProfitAnalytics(input?: { dateFrom?: string; dateTo?: string }) {
    const now = new Date();
    const startOfMonth = input?.dateFrom ? new Date(input.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfRange = input?.dateTo ? new Date(input.dateTo) : undefined;
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const rangeFilter = dateFilter(startOfMonth, endOfRange);

    const [monthlyIncome, monthlyExpense, yearlyIncome, yearlyExpense] = await Promise.all([
      prisma.income.aggregate({ where: { date: rangeFilter }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: rangeFilter }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { date: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: startOfYear } }, _sum: { amount: true } }),
    ]);

    const grossRevenue = Number(monthlyIncome._sum.amount || 0);
    const totalExpense = Number(monthlyExpense._sum.amount || 0);
    const netProfit = grossRevenue - totalExpense;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      grossProfit: grossRevenue,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      yearly: {
        revenue: Number(yearlyIncome._sum.amount || 0),
        expense: Number(yearlyExpense._sum.amount || 0),
        profit: Number(yearlyIncome._sum.amount || 0) - Number(yearlyExpense._sum.amount || 0),
      },
    };
  },

  async getCashFlowAnalytics(input?: { dateFrom?: string; dateTo?: string; period?: Period }) {
    const { since, until, period } = getDateRange(input);

    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({
        where: { date: dateFilter(since, until) },
        select: { date: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { date: dateFilter(since, until) },
        select: { date: true, amount: true },
      }),
    ]);

    const incomeByPeriod = sumByPeriod(incomes, period);
    const expenseByPeriod = sumByPeriod(expenses, period);
    const periods = new Set([...incomeByPeriod.map((i) => i.period), ...expenseByPeriod.map((e) => e.period)]);

    return Array.from(periods)
      .sort()
      .map((month) => {
        const income = incomeByPeriod.find((i) => i.period === month)?.total || 0;
        const expense = expenseByPeriod.find((e) => e.period === month)?.total || 0;
        return { month, income, expense, net: income - expense };
      });
  },
};
