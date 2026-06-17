import { Role, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/response';

export const dashboardService = {
  async getAdminDashboard() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      todayIncome,
      monthlyIncome,
      todayExpense,
      monthlyExpense,
      totalStaff,
      attendanceToday,
      monthlyTrends,
      healthMetrics,
    ] = await Promise.all([
      prisma.income.aggregate({
        where: { date: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: Role.STAFF, isActive: true } }),
      prisma.attendance.count({ where: { date: startOfDay, checkIn: { not: null } } }),
      getMonthlyTrends(sixMonthsAgo),
      getHealthMetrics(),
    ]);

    const todayRev = Number(todayIncome._sum.amount || 0);
    const monthRev = Number(monthlyIncome._sum.amount || 0);
    const todayExp = Number(todayExpense._sum.amount || 0);
    const monthExp = Number(monthlyExpense._sum.amount || 0);
    const netProfit = monthRev - monthExp;
    const cashFlow = todayRev - todayExp;

    return {
      cards: {
        todayRevenue: todayRev,
        monthlyRevenue: monthRev,
        todayExpense: todayExp,
        monthlyExpense: monthExp,
        netProfit,
        cashFlow,
        totalStaff,
        attendanceToday,
      },
      charts: monthlyTrends,
      healthScore: calculateHealthScore(healthMetrics),
      insights: generateInsights(healthMetrics),
    };
  },

  async getStaffDashboard(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayAttendance, tasks, recentIncome, recentExpense] = await Promise.all([
      prisma.attendance.findUnique({
        where: { userId_date: { userId, date: startOfDay } },
      }),
      prisma.task.findMany({
        where: { assignedToId: userId, status: { not: 'COMPLETED' } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.income.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { category: true },
      }),
      prisma.expense.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { category: true },
      }),
    ]);

    return {
      attendanceStatus: todayAttendance
        ? { checkedIn: !!todayAttendance.checkIn, checkedOut: !!todayAttendance.checkOut, isLate: todayAttendance.isLate }
        : { checkedIn: false, checkedOut: false, isLate: false },
      assignedTasks: tasks,
      recentIncome,
      recentExpense,
      pendingTasksCount: tasks.length,
    };
  },
};

async function getMonthlyTrends(since: Date) {
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({ where: { date: { gte: since } }, select: { date: true, amount: true } }),
    prisma.expense.findMany({ where: { date: { gte: since } }, select: { date: true, amount: true } }),
  ]);

  const group = (items: { date: Date; amount: unknown }[]) => {
    const map = new Map<string, number>();
    for (const item of items) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + Number(item.amount));
    }
    return map;
  };

  const incomeMap = group(incomes);
  const expenseMap = group(expenses);
  const sortedMonths = Array.from(new Set([...incomeMap.keys(), ...expenseMap.keys()])).sort();

  return {
    revenue: sortedMonths.map((m) => ({ month: m, value: incomeMap.get(m) || 0 })),
    expense: sortedMonths.map((m) => ({ month: m, value: expenseMap.get(m) || 0 })),
    profit: sortedMonths.map((m) => ({
      month: m,
      value: (incomeMap.get(m) || 0) - (expenseMap.get(m) || 0),
    })),
    cashFlow: sortedMonths.map((m) => ({
      month: m,
      income: incomeMap.get(m) || 0,
      expense: expenseMap.get(m) || 0,
    })),
  };
}

async function getHealthMetrics() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonthIncome, lastMonthIncome, thisMonthExpense, lastMonthExpense, attendanceRate] =
    await Promise.all([
      prisma.income.aggregate({ where: { date: { gte: thisMonth } }, _sum: { amount: true } }),
      prisma.income.aggregate({
        where: { date: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({ where: { date: { gte: thisMonth } }, _sum: { amount: true } }),
      prisma.expense.aggregate({
        where: { date: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.attendance.count({ where: { date: { gte: thisMonth }, checkIn: { not: null } } }),
    ]);

  const staffCount = await prisma.user.count({ where: { role: Role.STAFF, isActive: true } });
  const workingDays = Math.min(now.getDate(), 22);

  return {
    thisMonthRevenue: Number(thisMonthIncome._sum.amount || 0),
    lastMonthRevenue: Number(lastMonthIncome._sum.amount || 0),
    thisMonthExpense: Number(thisMonthExpense._sum.amount || 0),
    lastMonthExpense: Number(lastMonthExpense._sum.amount || 0),
    attendanceRate: staffCount > 0 ? attendanceRate / (staffCount * workingDays) : 0,
  };
}

function calculateHealthScore(metrics: Awaited<ReturnType<typeof getHealthMetrics>>) {
  let score = 0;

  const revenueGrowth =
    metrics.lastMonthRevenue > 0
      ? ((metrics.thisMonthRevenue - metrics.lastMonthRevenue) / metrics.lastMonthRevenue) * 100
      : 0;
  score += Math.min(Math.max(revenueGrowth + 25, 0), 25);

  const expenseRatio =
    metrics.thisMonthRevenue > 0 ? (metrics.thisMonthExpense / metrics.thisMonthRevenue) * 100 : 100;
  score += Math.min(Math.max(25 - expenseRatio / 4, 0), 25);

  const cashFlow = metrics.thisMonthRevenue - metrics.thisMonthExpense;
  score += cashFlow > 0 ? 25 : Math.max(25 + cashFlow / 1000, 0);

  score += Math.min(metrics.attendanceRate * 25, 25);

  const finalScore = Math.round(Math.min(Math.max(score, 0), 100));
  let rating: string;
  if (finalScore >= 80) rating = 'Excellent';
  else if (finalScore >= 60) rating = 'Good';
  else if (finalScore >= 40) rating = 'Average';
  else rating = 'Poor';

  return { score: finalScore, rating };
}

function generateInsights(metrics: Awaited<ReturnType<typeof getHealthMetrics>>) {
  const insights: string[] = [];

  if (metrics.lastMonthRevenue > 0) {
    const growth =
      ((metrics.thisMonthRevenue - metrics.lastMonthRevenue) / metrics.lastMonthRevenue) * 100;
    if (growth > 0) insights.push(`Revenue increased ${growth.toFixed(1)}% this month.`);
    else if (growth < 0) insights.push(`Revenue decreased ${Math.abs(growth).toFixed(1)}% this month.`);
  }

  if (metrics.thisMonthExpense > metrics.lastMonthExpense * 1.2) {
    insights.push('Expenses are unusually high compared to last month.');
  }

  if (
    metrics.lastMonthRevenue > 0 &&
    metrics.thisMonthExpense / metrics.thisMonthRevenue >
      metrics.lastMonthExpense / metrics.lastMonthRevenue
  ) {
    insights.push('Expense growth exceeds revenue growth.');
  }

  const cashFlow = metrics.thisMonthRevenue - metrics.thisMonthExpense;
  if (cashFlow < 0) insights.push('Cash reserves may run low next month.');

  return insights;
}
