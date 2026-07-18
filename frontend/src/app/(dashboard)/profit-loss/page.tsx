'use client';

import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApiQuery } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { currentPeriodMonth, formatCurrency, formatPeriodMonth } from '@/lib/utils';

interface CategoryLine {
  categoryId: string;
  categoryName: string;
  total: number;
}

interface ProfitLossResponse {
  periodFrom: string;
  periodTo: string;
  basis: 'accrual';
  note: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  income: {
    total: number;
    byCategory: CategoryLine[];
  };
  expenses: {
    total: number;
    byCategory: CategoryLine[];
  };
}

function CategoryTable({
  title,
  lines,
  total,
  variant,
}: {
  title: string;
  lines: CategoryLine[];
  total: number;
  variant: 'income' | 'expense';
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span>{title}</span>
          <Badge variant={variant === 'income' ? 'success' : 'destructive'}>
            {formatCurrency(total)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-secondary/30">
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-right p-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.categoryId} className="border-b border-border/50">
                  <td className="p-4">{line.categoryName}</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lines.length && (
            <div className="p-8 text-center text-muted-foreground">No records for this period</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfitLossPage() {
  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth());

  const { data, isLoading } = useApiQuery<ProfitLossResponse>(
    queryKeys.profitLoss(periodMonth),
    `/profit-loss?periodMonth=${periodMonth}`
  );

  const periodLabel = useMemo(() => formatPeriodMonth(periodMonth), [periodMonth]);

  return (
    <AdminGuard>
      <div>
        <Header
          title="Accounts / P&L"
          subtitle="Performance by bill-for month (expenses) and payment date (income)"
        />
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 max-w-xl">
                <div className="space-y-2">
                  <Label>Bill for month</Label>
                  <Input
                    type="month"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-muted-foreground pb-2">
                    Showing P&L for <span className="font-medium text-foreground">{periodLabel}</span>.
                    Expenses use bill-for month; ledger still uses payment date.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading && !data ? (
            <div className="p-8 text-center text-muted-foreground">Loading P&L...</div>
          ) : data ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Income"
                  value={data.summary.totalIncome}
                  icon={TrendingUp}
                  format="currency"
                />
                <StatCard
                  title="Total Expenses"
                  value={data.summary.totalExpense}
                  icon={TrendingDown}
                  format="currency"
                />
                <StatCard
                  title="Net Profit"
                  value={data.summary.netProfit}
                  icon={Scale}
                  format="currency"
                />
                <StatCard
                  title="Profit Margin"
                  value={`${data.summary.profitMargin}%`}
                  icon={Scale}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <CategoryTable
                  title="Income by Category"
                  lines={data.income.byCategory}
                  total={data.income.total}
                  variant="income"
                />
                <CategoryTable
                  title="Expenses by Category"
                  lines={data.expenses.byCategory}
                  total={data.expenses.total}
                  variant="expense"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AdminGuard>
  );
}
