import { PlanKind, Role, SubscriptionStatus } from '../types/enums';
import { Account, Attendance, Expense, Income, Subscription, Task, User } from '../types/models';
import {
  COL,
  findMany,
  findManyForBusiness,
  getById,
  getCategoryMap,
  getAccountMap,
  getPartyMap,
  getUserMap,
  inDateRange,
  sortBy,
  startOfDay,
  sumAmounts,
} from '../lib/firestore';

export const dashboardService = {
  async getAdminDashboard(businessId: string) {
    const now = new Date();
    const startOfDay = startOfDayDate(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const in7Days = new Date(startOfDay);
    in7Days.setDate(in7Days.getDate() + 7);

    const [incomes, expenses, staff, attendance, subscriptions, accounts] = await Promise.all([
      findManyForBusiness<Income>(COL.income, businessId),
      findManyForBusiness<Expense>(COL.expenses, businessId),
      findMany<User>(COL.users, (u) => u.role === Role.STAFF && u.isActive),
      findMany<Attendance>(COL.attendance),
      findManyForBusiness<Subscription>(COL.subscriptions, businessId),
      findManyForBusiness<Account>(COL.accounts, businessId),
    ]);

    const todayRev = sumAmounts(incomes, startOfDay);
    const monthRev = sumAmounts(incomes, startOfMonth);
    const yearRev = sumAmounts(incomes, startOfYear);
    const todayExp = sumAmounts(expenses, startOfDay);
    const monthExp = sumAmounts(expenses, startOfMonth);
    const yearExp = sumAmounts(expenses, startOfYear);
    const netProfit = monthRev - monthExp;
    const netExpense = monthExp;
    const cashFlow = todayRev - todayExp;

    const attendanceToday = attendance.filter(
      (a) => a.date.getTime() === startOfDay.getTime() && a.checkIn
    ).length;

    const monthlyTrends = getMonthlyTrends(
      incomes.filter((i) => i.date >= sixMonthsAgo),
      expenses.filter((e) => e.date >= sixMonthsAgo)
    );
    const healthMetrics = getHealthMetrics(incomes, expenses, attendance, staff.length, now);

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const todayIncomes = incomes.filter((i) => i.date >= startOfDay);
    const collectionByModeMap = new Map<string, number>();
    for (const inc of todayIncomes) {
      const mode = inc.accountId
        ? accountMap.get(inc.accountId)?.type || accountMap.get(inc.accountId)?.name || 'Other'
        : 'Unassigned';
      collectionByModeMap.set(mode, (collectionByModeMap.get(mode) || 0) + Number(inc.amount));
    }
    const collectionByMode = Array.from(collectionByModeMap.entries())
      .map(([mode, amount]) => ({ mode, amount }))
      .sort((a, b) => b.amount - a.amount);

    const isActiveSub = (s: Subscription) => {
      if (s.status === SubscriptionStatus.CANCELLED) return false;
      return new Date(s.endDate) >= startOfDay && s.status !== SubscriptionStatus.EXPIRED;
    };
    const isExpiredSub = (s: Subscription) =>
      s.status === SubscriptionStatus.EXPIRED || new Date(s.endDate) < startOfDay;

    const memberships = subscriptions.filter((s) => s.kind === PlanKind.MEMBERSHIP);
    const pts = subscriptions.filter((s) => s.kind === PlanKind.PERSONAL_TRAINING);

    const expiring = memberships
      .filter(
        (s) =>
          s.status !== SubscriptionStatus.CANCELLED &&
          new Date(s.endDate) >= startOfDay &&
          new Date(s.endDate) <= in7Days
      )
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 10);

    const partyMap = await getPartyMap(expiring.map((s) => s.partyId));

    const leaderboardMap = new Map<string, { id: string; name: string; today: number; month: number }>();
    const userMap = await getUserMap(
      incomes.flatMap((i) => [i.creditedToId, i.createdById].filter(Boolean) as string[])
    );
    for (const inc of incomes) {
      if (inc.date < startOfMonth) continue;
      const id = inc.creditedToId || inc.createdById;
      const name = userMap.get(id)?.name || 'Unknown';
      const row = leaderboardMap.get(id) || { id, name, today: 0, month: 0 };
      row.month += Number(inc.amount);
      if (inc.date >= startOfDay) row.today += Number(inc.amount);
      leaderboardMap.set(id, row);
    }
    const salesLeaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => b.month - a.month)
      .slice(0, 8);

    const cashAccounts = accounts.filter((a) => a.type === 'CASH' && a.isActive !== false);
    const cashBalance = cashAccounts.reduce((s, a) => s + Number(a.openingBalance || 0), 0);
    // Approximate cashbook cash: opening + income to cash - expense from cash (simplified)
    let cashIn = 0;
    let cashOut = 0;
    for (const inc of incomes) {
      if (!inc.accountId) continue;
      const acc = accountMap.get(inc.accountId);
      if (acc?.type === 'CASH') cashIn += Number(inc.amount);
    }
    for (const exp of expenses) {
      if (!exp.accountId) continue;
      const acc = accountMap.get(exp.accountId);
      if (acc?.type === 'CASH') cashOut += Number(exp.amount);
    }

    return {
      cards: {
        todayRevenue: todayRev,
        monthlyRevenue: monthRev,
        yearlyRevenue: yearRev,
        todayExpense: todayExp,
        monthlyExpense: monthExp,
        yearlyExpense: yearExp,
        netProfit,
        netExpense,
        cashFlow,
        totalStaff: staff.length,
        attendanceToday,
      },
      charts: monthlyTrends,
      healthScore: calculateHealthScore(healthMetrics),
      insights: generateInsights(healthMetrics),
      gymOps: {
        collectionByMode,
        membership: {
          active: memberships.filter(isActiveSub).length,
          expired: memberships.filter(isExpiredSub).length,
          cancelled: memberships.filter((s) => s.status === SubscriptionStatus.CANCELLED).length,
        },
        personalTraining: {
          active: pts.filter(isActiveSub).length,
          expired: pts.filter(isExpiredSub).length,
        },
        expiringSoon: expiring.map((s) => ({
          id: s.id,
          partyId: s.partyId,
          partyName: partyMap.get(s.partyId)?.name || 'Client',
          planName: s.planName,
          endDate: s.endDate,
        })),
        salesLeaderboard,
        cashbook: {
          openingEstimate: cashBalance,
          cashIn,
          cashOut,
          closingEstimate: cashBalance + cashIn - cashOut,
        },
      },
    };
  },

  async getStaffDashboard(businessId: string, userId: string) {
    const startOfDay = startOfDayDate(new Date());

    const [todayAttendance, tasks, recentIncome, recentExpense] = await Promise.all([
      getById<Attendance>(COL.attendance, `${userId}_${startOfDay.toISOString().split('T')[0]}`),
      findMany<Task>(COL.tasks, (t) => t.assignedToId === userId && t.status !== 'COMPLETED'),
      findManyForBusiness<Income>(COL.income, businessId, (i) => i.createdById === userId),
      findManyForBusiness<Expense>(COL.expenses, businessId, (e) => e.createdById === userId),
    ]);

    const sortedTasks = sortBy(tasks, 'dueDate', 'asc').slice(0, 5);
    const incomeItems = sortBy(recentIncome, 'createdAt', 'desc').slice(0, 5);
    const expenseItems = sortBy(recentExpense, 'createdAt', 'desc').slice(0, 5);

    const categoryMap = await getCategoryMap([
      ...incomeItems.map((i) => i.categoryId),
      ...expenseItems.map((e) => e.categoryId),
    ]);
    const accountMap = await getAccountMap([
      ...incomeItems.map((i) => i.accountId || ''),
      ...expenseItems.map((e) => e.accountId || ''),
    ]);
    const userMap = await getUserMap([
      ...incomeItems.map((i) => i.createdById),
      ...expenseItems.map((e) => e.createdById),
    ]);

    const mapIncome = (item: Income) => ({
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
    });

    const mapExpense = (item: Expense) => ({
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
      createdBy: {
        id: item.createdById,
        name: userMap.get(item.createdById)?.name || 'Unknown',
      },
    });

    return {
      attendanceStatus: todayAttendance
        ? {
            checkedIn: !!todayAttendance.checkIn,
            checkedOut: !!todayAttendance.checkOut,
            isLate: todayAttendance.isLate,
          }
        : { checkedIn: false, checkedOut: false, isLate: false },
      assignedTasks: sortedTasks,
      recentIncome: incomeItems.map(mapIncome),
      recentExpense: expenseItems.map(mapExpense),
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
