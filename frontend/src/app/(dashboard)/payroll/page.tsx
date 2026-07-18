'use client';

import { useMemo, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/types';

interface PayrollPreview {
  periodMonth: string;
  rows: {
    userId: string;
    name: string;
    email: string;
    salary: number;
    alreadyGenerated: boolean;
  }[];
  pendingCount: number;
  pendingTotal: number;
}

export default function PayrollPage() {
  const invalidate = useInvalidate();
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [periodMonth, setPeriodMonth] = useState(defaultMonth);
  const [accountId, setAccountId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: preview, isLoading, refetch } = useApiQuery<PayrollPreview>(
    ['payroll', periodMonth],
    `/payroll/preview?periodMonth=${periodMonth}`,
    { staleTime: 10_000 }
  );
  const { data: accounts = [] } = useApiQuery<Account[]>(
    queryKeys.accounts(),
    '/accounts',
    { staleTime: 60_000 }
  );

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.isActive !== false),
    [accounts]
  );

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const result = await api.post<{ createdCount: number; totalAmount: number }>(
        '/payroll/generate',
        {
          periodMonth,
          ...(accountId ? { accountId } : {}),
        }
      );
      setMessage(
        `Created ${result.createdCount} salary expenses totaling ${formatCurrency(result.totalAmount)}.`
      );
      await refetch();
      invalidate(queryKeys.expenses(''));
      invalidate(queryKeys.ledger(''));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminGuard>
      <div>
        <Header
          title="Payroll"
          subtitle="Generate monthly salary expenses into Cashbook"
          actions={
            <Button onClick={generate} disabled={generating || !preview?.pendingCount}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Generate Expenses
            </Button>
          }
        />
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Pay Month</Label>
                <Input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Account</Label>
                <Select value={accountId || 'auto'} onValueChange={(v) => setAccountId(v === 'auto' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Auto (Cash)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (prefer Cash)</SelectItem>
                    {cashAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 self-end">
                <p className="text-sm text-muted-foreground">
                  Pending: <span className="font-semibold text-foreground">{preview?.pendingCount ?? 0}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{formatCurrency(preview?.pendingTotal ?? 0)}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {message && (
            <Card>
              <CardContent className="p-4 text-sm">{message}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff salaries — {periodMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading && !preview ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4">Staff</th>
                      <th className="text-left p-4">Email</th>
                      <th className="text-right p-4">Salary</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.rows || []).map((row) => (
                      <tr key={row.userId} className="border-b border-border/50">
                        <td className="p-4 font-medium">{row.name}</td>
                        <td className="p-4 text-muted-foreground">{row.email}</td>
                        <td className="p-4 text-right font-semibold">{formatCurrency(row.salary)}</td>
                        <td className="p-4">
                          {row.alreadyGenerated ? (
                            <Badge variant="success">Generated</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!preview?.rows.length && !isLoading && (
                <div className="p-8 text-center text-muted-foreground">
                  No active staff with salary configured
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
