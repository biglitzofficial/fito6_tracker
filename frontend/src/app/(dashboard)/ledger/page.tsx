'use client';

import { useState, useMemo } from 'react';
import { Download, Search, BookOpen, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LedgerEntry {
  id: string;
  referenceId: string;
  receiptNumber?: string | null;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  createdBy: string;
}

interface LedgerResponse {
  entries: LedgerEntry[];
  summary: {
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    netMovement: number;
    closingBalance: number;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function LedgerPage() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [type, setType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [page, setPage] = useState(1);

  const ledgerParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      type,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
    return params.toString();
  }, [page, type, debouncedSearch, dateFrom, dateTo]);

  const { data, isLoading } = useApiQuery<LedgerResponse>(
    queryKeys.ledger(ledgerParams),
    `/ledger?${ledgerParams}`
  );

  const exportCsv = async () => {
    const params = new URLSearchParams({
      type,
      ...(search ? { search } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
    const result = await api.get<{ content: string; filename: string }>(`/ledger/export?${params}`);
    const blob = new Blob([result.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
  };

  return (
    <AdminGuard>
      <div>
        <Header title="General Ledger" subtitle="Complete financial transaction book with running balance" />
        <div className="p-6 space-y-6">
          {data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Opening Balance" value={data.summary.openingBalance} icon={Wallet} format="currency" />
              <StatCard title="Total Income" value={data.summary.totalIncome} icon={ArrowDownLeft} format="currency" />
              <StatCard title="Total Expense" value={data.summary.totalExpense} icon={ArrowUpRight} format="currency" />
              <StatCard title="Closing Balance" value={data.summary.closingBalance} icon={BookOpen} format="currency" />
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Search receipt no., description, category..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Transactions</SelectItem>
                      <SelectItem value="INCOME">Income Only</SelectItem>
                      <SelectItem value="EXPENSE">Expense Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={exportCsv}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading && !data ? (
                <div className="p-8 text-center text-muted-foreground">Loading ledger...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground bg-secondary/30">
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">Receipt No</th>
                        <th className="text-left p-4 font-medium">Description</th>
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-right p-4 font-medium">Debit</th>
                        <th className="text-right p-4 font-medium">Credit</th>
                        <th className="text-right p-4 font-medium">Balance</th>
                        <th className="text-left p-4 font-medium">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                          <td className="p-4 whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="p-4">
                            <Badge variant={entry.type === 'INCOME' ? 'success' : 'destructive'}>
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-xs whitespace-nowrap">
                            {entry.receiptNumber || '—'}
                          </td>
                          <td className="p-4 max-w-[200px] truncate">{entry.description}</td>
                          <td className="p-4"><Badge variant="secondary">{entry.category}</Badge></td>
                          <td className="p-4 text-right text-destructive font-medium">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                          </td>
                          <td className="p-4 text-right text-success font-medium">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                          </td>
                          <td className="p-4 text-right font-semibold">{formatCurrency(entry.balance)}</td>
                          <td className="p-4 text-muted-foreground">{entry.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data?.entries.length && (
                    <div className="p-8 text-center text-muted-foreground">No ledger entries for this period</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} entries)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
