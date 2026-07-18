'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QueryState } from '@/components/ui/query-state';
import { useApiQuery, useSubscriptions } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Income, PaginatedResponse } from '@/types';

function paymentStatus(paid: number, total: number): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  if (paid <= 0) return { label: 'Unpaid', variant: 'destructive' };
  if (paid + 0.001 >= total) return { label: 'Paid', variant: 'success' };
  return { label: 'Partial', variant: 'warning' };
}

export default function BillingPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: incomeRes, isLoading, isError, error, refetch } = useApiQuery<PaginatedResponse<Income>>(
    queryKeys.income(search),
    `/income?search=${encodeURIComponent(search)}&limit=100`
  );
  const { data: memberships = [] } = useSubscriptions('MEMBERSHIP');
  const items = incomeRes?.items ?? [];

  const pendingTotal = useMemo(() => {
    return memberships.reduce((sum, s) => {
      const bal = Math.max(0, Number(s.priceInclGst) - Number(s.amountPaid || 0));
      return sum + bal;
    }, 0);
  }, [memberships]);

  const invoiceRows = useMemo(() => {
    // Prefer subscription-backed rows, enriched with linked income receipts
    const incomeByParty = new Map<string, Income[]>();
    for (const inc of items) {
      if (!inc.partyId) continue;
      const list = incomeByParty.get(inc.partyId) || [];
      list.push(inc);
      incomeByParty.set(inc.partyId, list);
    }

    return memberships.map((sub) => {
      const total = Number(sub.priceInclGst);
      const paid = Number(sub.amountPaid || 0);
      const pending = Math.max(0, total - paid);
      const status = paymentStatus(paid, total);
      const linked = items.find((i) => i.id === sub.incomeId)
        || (sub.partyId ? (incomeByParty.get(sub.partyId) || [])[0] : undefined);
      return { sub, total, paid, pending, status, receipt: linked?.receiptNumber || sub.receiptNumber };
    });
  }, [memberships, items]);

  const filtered = invoiceRows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.sub.party?.name?.toLowerCase().includes(q) ||
      row.sub.planName.toLowerCase().includes(q) ||
      row.receipt?.toLowerCase().includes(q) ||
      row.sub.id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Header
        title="Billing / Invoices"
        subtitle={`${memberships.length} membership invoices · Pending ${formatCurrency(pendingTotal)}`}
        actions={
          <Button asChild>
            <Link href="/clients">
              <Plus className="h-4 w-4" /> New Client
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search client / plan / receipt"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasData={!!incomeRes || !!memberships}
          onRetry={() => refetch()}
        >
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#fafbfd] text-muted-foreground">
                    <th className="text-left p-3 text-[11px] uppercase">Invoice / Receipt</th>
                    <th className="text-left p-3 text-[11px] uppercase">Date</th>
                    <th className="text-left p-3 text-[11px] uppercase">Customer</th>
                    <th className="text-left p-3 text-[11px] uppercase">Description</th>
                    <th className="text-right p-3 text-[11px] uppercase">Total</th>
                    <th className="text-right p-3 text-[11px] uppercase">Paid</th>
                    <th className="text-right p-3 text-[11px] uppercase">Pending</th>
                    <th className="text-left p-3 text-[11px] uppercase">Status</th>
                    <th className="text-right p-3 text-[11px] uppercase"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ sub, total, paid, pending, status, receipt }) => (
                    <tr key={sub.id} className="border-b border-border/60 hover:bg-[#fbfcff]">
                      <td className="p-3 font-mono text-xs font-semibold text-[#1554c0]">
                        {receipt || sub.id.slice(0, 8)}
                      </td>
                      <td className="p-3">{formatDate(sub.startDate)}</td>
                      <td className="p-3">
                        <button
                          className="font-semibold text-[#1554c0] hover:underline"
                          onClick={() => router.push(`/parties/${sub.partyId}`)}
                        >
                          {sub.party?.name || 'Client'}
                        </button>
                      </td>
                      <td className="p-3">{sub.planName}</td>
                      <td className="p-3 text-right">{formatCurrency(total)}</td>
                      <td className="p-3 text-right text-success">{formatCurrency(paid)}</td>
                      <td className={`p-3 text-right ${pending > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {formatCurrency(pending)}
                      </td>
                      <td className="p-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/parties/${sub.partyId}`)}
                        >
                          View
                        </Button>
                        {pending > 0 && (
                          <Button size="sm" asChild>
                            <Link href={`/income?action=add&partyId=${sub.partyId}`}>Collect</Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No invoices yet — register a client with a membership plan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </QueryState>
      </div>
    </div>
  );
}
