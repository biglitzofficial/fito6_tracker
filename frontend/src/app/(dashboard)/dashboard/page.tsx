'use client';

import Link from 'next/link';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  Users,
  UserCheck,
  Plus,
  FileText,
  Sparkles,
  Activity,
  CalendarRange,
  CalendarDays,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AccountsWalletMenu } from '@/components/dashboard/accounts-wallet-menu';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardChart } from '@/components/dashboard/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { AdminDashboard, StaffDashboard } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useApiQuery<AdminDashboard | StaffDashboard>(
    queryKeys.dashboard,
    '/dashboard',
    { staleTime: 30_000 }
  );

  if (isLoading && !data) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !user) return null;

  if (isAdmin(user)) {
    const adminData = data as AdminDashboard;
    return (
      <div>
        <Header
          title="Dashboard"
          subtitle="Business overview and insights"
          actions={<AccountsWalletMenu />}
        />
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today Collection" value={adminData.cards.todayRevenue} icon={DollarSign} format="currency" />
            <StatCard title="Monthly Collection" value={adminData.cards.monthlyRevenue} icon={TrendingUp} format="currency" />
            <StatCard title="Yearly Collection" value={adminData.cards.yearlyRevenue ?? 0} icon={CalendarRange} format="currency" />
            <StatCard title="Net Revenue" value={adminData.cards.netProfit} icon={TrendingUp} format="currency" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today's Expense" value={adminData.cards.todayExpense} icon={TrendingDown} format="currency" />
            <StatCard title="Monthly Expense" value={adminData.cards.monthlyExpense} icon={Wallet} format="currency" />
            <StatCard title="Yearly Expense" value={adminData.cards.yearlyExpense ?? 0} icon={CalendarDays} format="currency" />
            <StatCard title="Net Expense" value={adminData.cards.netExpense ?? adminData.cards.monthlyExpense} icon={TrendingDown} format="currency" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Business Health
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#6366f1" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${adminData.healthScore.score * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{adminData.healthScore.score}</span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <Badge variant={adminData.healthScore.rating === 'Excellent' ? 'success' : adminData.healthScore.rating === 'Good' ? 'default' : 'warning'} className="mt-4">
                  {adminData.healthScore.rating}
                </Badge>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminData.insights.length ? adminData.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-accent/50 p-4 text-sm">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {insight}
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No insights available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardChart data={adminData.charts.revenue} title="Revenue Trend" type="area" />
            <DashboardChart data={adminData.charts.expense} title="Expense Trend" type="bar" />
            <DashboardChart data={adminData.charts.profit} title="Profit Trend" type="line" />
            <DashboardChart data={adminData.charts.cashFlow} title="Cash Flow" type="cashflow" />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild><Link href="/income?action=add"><Plus className="h-4 w-4" /> Add Income</Link></Button>
              <Button asChild variant="secondary"><Link href="/expenses?action=add"><Plus className="h-4 w-4" /> Add Expense</Link></Button>
              <Button asChild variant="secondary"><Link href="/staff?action=add"><Users className="h-4 w-4" /> Add Staff</Link></Button>
              <Button asChild variant="outline"><Link href="/reports"><FileText className="h-4 w-4" /> Generate Report</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const staffData = data as StaffDashboard;
  return (
    <div>
      <Header title="My Dashboard" subtitle={`Welcome back, ${user.name}`} />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Attendance"
            value={staffData.attendanceStatus.checkedIn ? (staffData.attendanceStatus.checkedOut ? 'Done' : 'Checked In') : 'Not Checked In'}
            icon={UserCheck}
          />
          <StatCard title="Assigned Tasks" value={staffData.pendingTasksCount} icon={Activity} />
          <StatCard title="Recent Income" value={staffData.recentIncome.length} icon={TrendingUp} />
          <StatCard title="Recent Expenses" value={staffData.recentExpense.length} icon={TrendingDown} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">My Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {staffData.assignedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl bg-accent/30 p-4">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.dueDate && <p className="text-xs text-muted-foreground">Due: {formatDate(task.dueDate)}</p>}
                  </div>
                  <Badge variant={task.status === 'COMPLETED' ? 'success' : task.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {!staffData.assignedTasks.length && <p className="text-sm text-muted-foreground">No pending tasks</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild><Link href="/attendance">Mark Attendance</Link></Button>
              <Button asChild variant="secondary"><Link href="/income?action=add">Add Income</Link></Button>
              <Button asChild variant="secondary"><Link href="/expenses?action=add">Add Expense</Link></Button>
              <Button asChild variant="outline"><Link href="/documents?action=upload">Upload Invoice</Link></Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Income</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {staffData.recentIncome.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span>
                    {item.receiptNumber ? `${item.receiptNumber} · ` : ''}
                    {item.category?.name ?? 'Unknown'}
                    {item.account?.name ? ` · ${item.account.name}` : ''}
                  </span>
                  <span className="text-success font-medium">{formatCurrency(Number(item.amount))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Expenses</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {staffData.recentExpense.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span>
                    {item.category?.name ?? 'Unknown'}
                    {item.account?.name ? ` · ${item.account.name}` : ''}
                  </span>
                  <span className="text-destructive font-medium">{formatCurrency(Number(item.amount))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
