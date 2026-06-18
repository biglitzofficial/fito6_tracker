import { Role } from '../types/enums';
import { Attendance, Expense, Income, Task, User } from '../types/models';
import {
  COL,
  findMany,
  getById,
  inDateRange,
  sortBy,
  startOfDay,
  sumAmounts,
} from '../lib/firestore';

export const dashboardService = {
  async getAdminDashboard() {
    const now = new Date();
    const startOfDay = startOfDayDate(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [incomes, expenses, staff, attendance] = await Promise.all([
      findMany<Income>(COL.income),
      findMany<Expense>(COL.expenses),
      findMany<User>(COL.users, (u) => u.role === Role.STAFF && u.isActive),
      findMany<Attendance>(COL.attendance),
    ]);

    const todayRev = sumAmounts(incomes, startOfDay);
    const monthRev = sumAmounts(incomes, startOfMonth);
    const todayExp = sumAmounts(expenses, startOfDay);
    const monthExp = sumAmounts(expenses, startOfMonth);
    const netProfit = monthRev - monthExp;
    const cashFlow = todayRev - todayExp;

    const attendanceToday = attendance.filter(
      (a) => a.date.getTime() === startOfDay.getTime() && a.checkIn
    ).length;

    const monthlyTrends = getMonthlyTrends(
      incomes.filter((i) => i.date >= sixMonthsAgo),
      expenses.filter((e) => e.date >= sixMonthsAgo)
    );
    const healthMetrics = getHealthMetrics(incomes, expenses, attendance, staff.length, now);

    return {
      cards: {
        todayRevenue: todayRev,
        monthlyRevenue: monthRev,
        todayExpense: todayExp,
        monthlyExpense: monthExp,
        netProfit,
        cashFlow,
        totalStaff: staff.length,
        attendanceToday,
      },
      charts: monthlyTrends,
      healthScore: calculateHealthScore(healthMetrics),
      insights: generateInsights(healthMetrics),
    };
  },

  async getStaffDashboard(userId: string) {
    const startOfDay = startOfDayDate(new Date());

    const [todayAttendance, tasks, recentIncome, recentExpense] = await Promise.all([
      getById<Attendance>(COL.attendance, `${userId}_${startOfDay.toISOString().split('T')[0]}`),
      findMany<Task>(COL.tasks, (t) => t.assignedToId === userId && t.status !== 'COMPLETED'),
      findMany<Income>(COL.income, (i) => i.createdById === userId),
      findMany<Expense>(COL.expenses, (e) => e.createdById === userId),
    ]);

    const sortedTasks = sortBy(tasks, 'dueDate', 'asc').slice(0, 5);
    const incomeItems = sortBy(recentIncome, 'createdAt', 'desc').slice(0, 5);
    const expenseItems = sortBy(recentExpense, 'createdAt', 'desc').slice(0, 5);

    return {
      attendanceStatus: todayAttendance
        ? {
            checkedIn: !!todayAttendance.checkIn,
            checkedOut: !!todayAttendance.checkOut,
            isLate: todayAttendance.isLate,
          }
        : { checkedIn: false, checkedOut: false, isLate: false },
      assignedTasks: sortedTasks,
      recentIncome: incomeItems,
      recentExpense: expenseItems,
      pendingTasksCount: tasks.length,
    };
  },
};

function startOfDayDate(date: Date) {
  return startOfDay(date);
}

function getMonthlyTrends(incomes: Income[], expenses: Expense[]) {
  const group = (items: { date: Date; amount: number | unknown }[]) => {
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

function getHealthMetrics(
  incomes: Income[],
  expenses: Expense[],
  attendance: Attendance[],
  staffCount: number,
  now: Date
) {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthRevenue = sumAmounts(incomes, thisMonth);
  const lastMonthRevenue = sumAmounts(incomes, lastMonth, lastMonthEnd);
  const thisMonthExpense = sumAmounts(expenses, thisMonth);
  const lastMonthExpense = sumAmounts(expenses, lastMonth, lastMonthEnd);

  const attendanceRate = attendance.filter(
    (a) => inDateRange(a.date, thisMonth) && a.checkIn
  ).length;

  const workingDays = Math.min(now.getDate(), 22);

  return {
    thisMonthRevenue,
    lastMonthRevenue,
    thisMonthExpense,
    lastMonthExpense,
    attendanceRate: staffCount > 0 ? attendanceRate / (staffCount * workingDays) : 0,
  };
}

function calculateHealthScore(metrics: ReturnType<typeof getHealthMetrics>) {
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

function generateInsights(metrics: ReturnType<typeof getHealthMetrics>) {
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
