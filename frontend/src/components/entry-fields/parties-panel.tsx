'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserRound, Pencil, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/components/ui/query-state';
import { PARTY_TYPE_LABELS } from '@/components/forms/party-select-field';
import { PartyForm } from '@/components/parties/party-form';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidateParties, useUpsertPartyCache } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Party, PartyType } from '@/types';

interface PartiesPanelProps {
  autoOpenAdd?: boolean;
}

export function PartiesPanel({ autoOpenAdd }: PartiesPanelProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [typeFilter, setTypeFilter] = useState<PartyType | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(autoOpenAdd ?? false);
  const invalidateParties = useInvalidateParties();
  const upsertPartyCache = useUpsertPartyCache();

  const endpoint = typeFilter === 'ALL' ? '/parties' : `/parties?type=${typeFilter}`;
  const { data: parties = [], isLoading, isError, error, refetch } = useApiQuery<Party[]>(
    queryKeys.parties(typeFilter === 'ALL' ? undefined : typeFilter),
    endpoint
  );

  const filtered = parties.filter((party) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      party.name.toLowerCase().includes(q) ||
      party.phone?.toLowerCase().includes(q) ||
      party.email?.toLowerCase().includes(q) ||
      party.promotionSource?.toLowerCase().includes(q) ||
      party.address?.toLowerCase().includes(q) ||
      party.emergencyContactName?.toLowerCase().includes(q) ||
      PARTY_TYPE_LABELS[party.type].toLowerCase().includes(q)
    );
  });

  const handleSaved = (party?: Party) => {
    setShowForm(false);
    if (party) upsertPartyCache(party);
    invalidateParties();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Disable this party?')) return;
    await api.delete(`/parties/${id}`);
    invalidateParties();
  };

  const openProfile = (id: string) => router.push(`/parties/${id}`);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Parties</h2>
        <p className="text-sm text-muted-foreground">
          Manage client, staff, and vendor contacts with personal and emergency details.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PartyType | 'ALL')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {(Object.keys(PARTY_TYPE_LABELS) as PartyType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {PARTY_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Party
        </Button>
      </div>

      {showForm && (
        <PartyForm
          onCancel={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error} hasData={!!parties} onRetry={() => refetch()}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((party) => (
            <Card
              key={party.id}
              className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
              onClick={() => openProfile(party.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary">{PARTY_TYPE_LABELS[party.type]}</Badge>
                </div>
                <h3 className="font-semibold">{party.name}</h3>
                {party.email && <p className="text-sm text-muted-foreground mt-1">{party.email}</p>}
                {party.phone && <p className="text-sm text-muted-foreground">{party.phone}</p>}
                {party.promotionSource && (
                  <p className="text-xs text-muted-foreground mt-2">Source: {party.promotionSource}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => openProfile(party.id)}>
                    <Eye className="h-3 w-3" /> View Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/parties/${party.id}?edit=1`)}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  {isAdmin(user) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={(e) => handleDelete(party.id, e)}
                    >
                      Disable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!filtered.length && (
          <div className="p-8 text-center text-muted-foreground">
            No parties found. Add clients, staff, or vendors with contact details.
          </div>
        )}
      </QueryState>
    </div>
  );
}
