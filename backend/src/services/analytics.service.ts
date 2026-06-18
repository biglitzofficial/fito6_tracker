import { Category, Expense, Income } from '../types/models';
import { COL, findMany, getCategoryMap, inDateRange, sumAmounts } from '../lib/firestore';

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

function groupKey(date: Date, period: Period): string {
  const d = new Date(date);
  if (period === 'daily') return d.toISOString().split('T')[0];
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
    .map(([p, total]) => ({ period: p, total }));
}

export const analyticsService = {
  async getRevenueAnalytics(input?: { period?: Period; dateFrom?: string; dateTo?: string }) {
    const { since, until, period } = getDateRange(input);
    const items = (await findMany<Income>(COL.income)).filter((i) => inDateRange(i.date, since, until));
    return { period, data: sumByPeriod(items, period) };
  },

  async getExpenseAnalytics(input?: { dateFrom?: string; dateTo?: string; period?: Period }) {
    const { since, until, period } = getDateRange(input);
    const expenses = (await findMany<Expense>(COL.expenses)).filter((e) => inDateRange(e.date, since, until));

    const categoryTotals = new Map<string, number>();
    for (const expense of expenses) {
      categoryTotals.set(
        expense.categoryId,
        (categoryTotals.get(expense.categoryId) || 0) + Number(expense.amount)
      );
    }

    const categoryMap = await getCategoryMap([...categoryTotals.keys()]);
    const categoryBreakdown = [...categoryTotals.entries()].map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId)?.name || 'Unknown',
      total,
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

    const [incomes, expenses] = await Promise.all([
      findMany<Income>(COL.income),
      findMany<Expense>(COL.expenses),
    ]);

    const grossRevenue = sumAmounts(incomes, startOfMonth, endOfRange);
    const totalExpense = sumAmounts(expenses, startOfMonth, endOfRange);
    const netProfit = grossRevenue - totalExpense;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    const yearlyRevenue = sumAmounts(incomes, startOfYear);
    const yearlyExpense = sumAmounts(expenses, startOfYear);

    return {
      grossProfit: grossRevenue,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      yearly: {
        revenue: yearlyRevenue,
        expense: yearlyExpense,
        profit: yearlyRevenue - yearlyExpense,
      },
    };
  },

  async getCashFlowAnalytics(input?: { dateFrom?: string; dateTo?: string; period?: Period }) {
    const { since, until, period } = getDateRange(input);

    const [incomes, expenses] = await Promise.all([
      findMany<Income>(COL.income),
      findMany<Expense>(COL.expenses),
    ]);

    const filteredIncomes = incomes.filter((i) => inDateRange(i.date, since, until));
    const filteredExpenses = expenses.filter((e) => inDateRange(e.date, since, until));

    const incomeByPeriod = sumByPeriod(filteredIncomes, period);
    const expenseByPeriod = sumByPeriod(filteredExpenses, period);
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
