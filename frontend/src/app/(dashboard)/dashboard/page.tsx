'use client';

import Link from 'next/link';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
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
    const ops = adminData.gymOps;
    return (
      <div>
        <Header
          title="Dashboard"
          subtitle="Gym ops + accounts overview"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><Link href="/clients"><Plus className="h-4 w-4" /> New Client</Link></Button>
              <AccountsWalletMenu />
            </div>
          }
        />
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Today&apos;s Summary</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Today Collection" value={adminData.cards.todayRevenue} icon={DollarSign} format="currency" />
              <StatCard title="Today Expense" value={adminData.cards.todayExpense} icon={TrendingDown} format="currency" />
              <StatCard title="Profit Today" value={adminData.cards.cashFlow} icon={TrendingUp} format="currency" />
              <StatCard title="Staff Present" value={adminData.cards.attendanceToday} icon={UserCheck} />
            </div>
          </div>

          {ops && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-3">Collection by Mode (Today)</h3>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {ops.collectionByMode.length ? ops.collectionByMode.map((m) => (
                    <Card key={m.mode}>
                      <CardContent className="p-3">
                        <p className="text-[11px] uppercase text-muted-foreground font-semibold">{m.mode}</p>
                        <p className="text-lg font-extrabold mt-1">{formatCurrency(m.amount)}</p>
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-sm text-muted-foreground col-span-full">No collections today yet.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Cashbook (Cash)</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Opening est.</span><span>{formatCurrency(ops.cashbook.openingEstimate)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cash In</span><span className="text-success">{formatCurrency(ops.cashbook.cashIn)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cash Out</span><span className="text-destructive">{formatCurrency(ops.cashbook.cashOut)}</span></div>
                    <div className="flex justify-between font-semibold border-t border-border pt-2"><span>Closing est.</span><span>{formatCurrency(ops.cashbook.closingEstimate)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Membership</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-semibold text-success">{ops.membership.active}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expired</span><span className="font-semibold text-destructive">{ops.membership.expired}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><span>{ops.membership.cancelled}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expiring (7d)</span><span className="text-primary font-semibold">{ops.expiringSoon.length}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Personal Training</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active PT</span><span className="font-semibold text-success">{ops.personalTraining.active}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expired PT</span><span className="font-semibold text-destructive">{ops.personalTraining.expired}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Collection</span><span>{formatCurrency(adminData.cards.monthlyRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Net Collection</span><span>{formatCurrency(adminData.cards.netProfit)}</span></div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Sales Leaderboard (This Month)</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-3 text-[11px] uppercase">Sold By</th>
                          <th className="text-right p-3 text-[11px] uppercase">Today</th>
                          <th className="text-right p-3 text-[11px] uppercase">Month</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ops.salesLeaderboard.map((row) => (
                          <tr key={row.id} className="border-b border-border/50">
                            <td className="p-3 font-medium">{row.name}</td>
                            <td className="p-3 text-right">{formatCurrency(row.today)}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(row.month)}</td>
                          </tr>
                        ))}
                        {!ops.salesLeaderboard.length && (
                          <tr><td colSpan={3} className="p-4 text-muted-foreground">No sales yet this month</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Expiring in 7 Days</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-3 text-[11px] uppercase">Member</th>
                          <th className="text-left p-3 text-[11px] uppercase">Package</th>
                          <th className="text-left p-3 text-[11px] uppercase">Ends</th>
                          <th className="text-right p-3 text-[11px] uppercase"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ops.expiringSoon.map((row) => (
                          <tr key={row.id} className="border-b border-border/50">
                            <td className="p-3">
                              <Link href={`/parties/${row.partyId}`} className="font-semibold text-[#1554c0] hover:underline">
                                {row.partyName}
                              </Link>
                            </td>
                            <td className="p-3">{row.planName}</td>
                            <td className="p-3">{formatDate(row.endDate)}</td>
                            <td className="p-3 text-right">
                              <Button size="sm" asChild>
                                <Link href={`/subscriptions?renew=${row.id}`}>Renew</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {!ops.expiringSoon.length && (
                          <tr><td colSpan={4} className="p-4 text-muted-foreground">Nothing expiring soon</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Monthly Collection" value={adminData.cards.monthlyRevenue} icon={TrendingUp} format="currency" />
            <StatCard title="Yearly Collection" value={adminData.cards.yearlyRevenue ?? 0} icon={CalendarRange} format="currency" />
            <StatCard title="Monthly Expense" value={adminData.cards.monthlyExpense} icon={Wallet} format="currency" />
            <StatCard title="Yearly Expense" value={adminData.cards.yearlyExpense ?? 0} icon={CalendarDays} format="currency" />
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
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e6eaf2" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#ff6a00" strokeWidth="8" strokeLinecap="round"
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
                  Insights
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
              <Button asChild><Link href="/clients"><Plus className="h-4 w-4" /> New Client</Link></Button>
              <Button asChild variant="secondary"><Link href="/billing"><FileText className="h-4 w-4" /> Billing</Link></Button>
              <Button asChild variant="secondary"><Link href="/expenses?action=add"><Plus className="h-4 w-4" /> Add Expense</Link></Button>
              <Button asChild variant="outline"><Link href="/reports"><FileText className="h-4 w-4" /> Reports</Link></Button>
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
                    {item.voucherNumber ? `${item.voucherNumber} · ` : ''}
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
