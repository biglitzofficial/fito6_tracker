'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, UserRound, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/components/ui/query-state';
import { Textarea } from '@/components/ui/textarea';
import { PARTY_TYPE_LABELS } from '@/components/forms/party-select-field';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Party, PartyType } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['STAFF', 'VENDOR', 'CUSTOMER', 'OTHER']),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function PartyForm({
  editingParty,
  onCancel,
  onSaved,
}: {
  editingParty?: Party | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!editingParty;

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingParty
      ? {
          name: editingParty.name,
          type: editingParty.type,
          phone: editingParty.phone || '',
          notes: editingParty.notes || '',
        }
      : { type: 'STAFF' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        type: data.type,
        phone: data.phone?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };
      if (isEditing) {
        await api.put(`/parties/${editingParty.id}`, {
          ...payload,
          phone: payload.phone || null,
          notes: payload.notes || null,
        });
      } else {
        await api.post('/parties', payload);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{isEditing ? 'Edit Party' : 'New Party (Contact)'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Party Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PARTY_TYPE_LABELS) as PartyType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {PARTY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Party Name</Label>
            <Input {...register('name')} placeholder="e.g. KASTHURI-MAID, ABC Suppliers" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register('phone')} placeholder="Optional" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} placeholder="Optional notes" rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save Changes' : 'Save Party'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface PartiesPanelProps {
  autoOpenAdd?: boolean;
}

export function PartiesPanel({ autoOpenAdd }: PartiesPanelProps) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [typeFilter, setTypeFilter] = useState<PartyType | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(autoOpenAdd ?? false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const invalidate = useInvalidate();

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
      PARTY_TYPE_LABELS[party.type].toLowerCase().includes(q)
    );
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingParty(null);
  };

  const handleSaved = () => {
    closeForm();
    invalidate(queryKeys.parties());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Disable this party?')) return;
    await api.delete(`/parties/${id}`);
    invalidate(queryKeys.parties());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Parties</h2>
        <p className="text-sm text-muted-foreground">Manage staff, vendors, and contacts for expense entries.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search parties..."
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
        <Button onClick={() => { setEditingParty(null); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4" /> Add Party
        </Button>
      </div>

      {(showForm || editingParty) && (
        <PartyForm
          key={editingParty?.id ?? 'new'}
          editingParty={editingParty}
          onCancel={closeForm}
          onSaved={handleSaved}
        />
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error} hasData={!!parties} onRetry={() => refetch()}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((party) => (
            <Card key={party.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary">{PARTY_TYPE_LABELS[party.type]}</Badge>
                </div>
                <h3 className="font-semibold">{party.name}</h3>
                {party.phone && <p className="text-sm text-muted-foreground mt-1">{party.phone}</p>}
                {party.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{party.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingParty(party); }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  {isAdmin(user) && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(party.id)}>
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
            No parties found. Add staff or vendors for salary and expense tracking.
          </div>
        )}
      </QueryState>
    </div>
  );
}
