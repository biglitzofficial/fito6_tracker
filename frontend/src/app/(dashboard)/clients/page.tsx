'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { ClientWizard } from '@/components/clients/client-wizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QueryState } from '@/components/ui/query-state';
import { useParties, useSubscriptions } from '@/hooks/use-api-query';
import { getMembershipBadgeStatus, membershipBadgeVariant, pickCurrentSubscription } from '@/lib/member-status';
import { formatDate } from '@/lib/utils';
import type { Subscription } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const { data: parties = [], isLoading, isError, error, refetch } = useParties('CUSTOMER');
  const { data: memberships = [] } = useSubscriptions('MEMBERSHIP');

  const byParty = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    for (const sub of memberships) {
      const list = map.get(sub.partyId) || [];
      list.push(sub);
      map.set(sub.partyId, list);
    }
    return map;
  }, [memberships]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parties
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      })
      .map((party) => {
        const current = pickCurrentSubscription(byParty.get(party.id) || []);
        return { party, current };
      });
  }, [parties, byParty, search]);

  return (
    <div>
      <Header
        title="Clients"
        subtitle={`${parties.length} registered members`}
        actions={
          <Button onClick={() => setShowWizard((v) => !v)}>
            <Plus className="h-4 w-4" /> New Client
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {showWizard && (
          <ClientWizard
            onClose={() => setShowWizard(false)}
            onComplete={(partyId) => {
              setShowWizard(false);
              router.push(`/parties/${partyId}`);
            }}
          />
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Filter name / phone / id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasData={!!parties}
          onRetry={() => refetch()}
        >
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#fafbfd] text-muted-foreground">
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">ID</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Name</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Mobile</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Package</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Valid Till</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Status</th>
                    <th className="text-left p-3 text-[11px] uppercase tracking-wide">Trainer</th>
                    <th className="text-right p-3 text-[11px] uppercase tracking-wide"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ party, current }) => {
                    const status = getMembershipBadgeStatus(current);
                    return (
                      <tr
                        key={party.id}
                        className="border-b border-border/60 hover:bg-[#fbfcff] cursor-pointer"
                        onClick={() => router.push(`/parties/${party.id}`)}
                      >
                        <td className="p-3 font-mono text-xs font-semibold">{party.id.slice(0, 8)}</td>
                        <td className="p-3 font-semibold text-[#1554c0]">{party.name}</td>
                        <td className="p-3">{party.phone || '—'}</td>
                        <td className="p-3">{current?.planName || '—'}</td>
                        <td className="p-3">{current ? formatDate(current.endDate) : '—'}</td>
                        <td className="p-3">
                          <Badge variant={membershipBadgeVariant(status)}>
                            {status === 'None' ? 'No Plan' : status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{current?.trainer?.name || '—'}</td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/parties/${party.id}`)}
                          >
                            Profile
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No clients yet — click New Client
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
