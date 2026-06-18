'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardChart } from '@/components/dashboard/charts';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalyticsPage() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const monthStart = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], []);

  const [preset, setPreset] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('period', preset === 'custom' ? 'daily' : preset);
    if (preset === 'custom') {
      params.set('dateFrom', dateFrom);
      params.set('dateTo', dateTo);
    }
    return params.toString();
  }, [preset, dateFrom, dateTo]);

  const profitQuery = preset === 'custom' ? `dateFrom=${dateFrom}&dateTo=${dateTo}` : '';
  const analyticsKey = `${query}|${profitQuery}`;

  const { data: analyticsData, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.analytics(analyticsKey),
    queryFn: async () => {
      const [revenue, expense, profit, cashFlow] = await Promise.all([
        api.get<{ period: string; data: { period: string; total: number }[] }>(`/analytics/revenue?${query}`),
        api.get<{ categoryBreakdown: { categoryName: string; total: number }[]; monthlyTrends: { month: string; total: number }[] }>(`/analytics/expense?${query}`),
        api.get<{ grossProfit: number; netProfit: number; profitMargin: number; yearly: { revenue: number; expense: number; profit: number } }>(`/analytics/profit?${profitQuery}`),
        api.get<{ month: string; income: number; expense: number; net: number }[]>(`/analytics/cash-flow?${query}`),
      ]);
      return { revenue, expense, profit, cashFlow };
    },
    staleTime: 60_000,
  });

  const revenue = analyticsData?.revenue ?? null;
  const expense = analyticsData?.expense ?? null;
  const profit = analyticsData?.profit ?? null;
  const cashFlow = analyticsData?.cashFlow ?? [];
  const loading = isLoading && !analyticsData;
  const error = queryError instanceof Error ? queryError.message : '';

  return (
    <AdminGuard>
      <div>
        <Header title="Business Analytics" subtitle="Revenue, expense, profit, and cash flow insights" />
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>View</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={preset !== 'custom'} />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={preset !== 'custom'} />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full" onClick={() => setPreset(preset)}>
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-muted-foreground py-8">Loading analytics...</div>
          )}

          {!loading && profit && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Gross Profit" value={profit.grossProfit} icon={DollarSign} format="currency" />
              <StatCard title="Net Profit" value={profit.netProfit} icon={TrendingUp} format="currency" />
              <StatCard title="Profit Margin" value={`${profit.profitMargin}%`} icon={Wallet} />
              <StatCard title="Yearly Revenue" value={profit.yearly.revenue} icon={TrendingUp} format="currency" />
            </div>
          )}

          {!loading && (
          <div className="grid gap-6 lg:grid-cols-2">
            {revenue && (
              <DashboardChart
                data={revenue.data.map((d) => ({ month: d.period, value: d.total }))}
                title="Monthly Revenue"
                type="area"
              />
            )}
            {expense && (
              <DashboardChart
                data={expense.monthlyTrends.map((d) => ({ month: d.month, value: d.total }))}
                title="Monthly Expenses"
                type="bar"
              />
            )}
            <DashboardChart data={cashFlow} title="Income vs Expense" type="cashflow" />
            {expense && (
              <Card>
                <CardHeader><CardTitle className="text-base">Expense by Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={expense.categoryBreakdown}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ categoryName, percent }) => `${categoryName} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expense.categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
