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
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  promotionSource: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function partyToFormDefaults(party: Party): FormData {
  return {
    name: party.name,
    type: party.type,
    email: party.email || '',
    phone: party.phone || '',
    promotionSource: party.promotionSource || '',
    address: party.address || '',
    emergencyContactName: party.emergencyContactName || '',
    emergencyContactPhone: party.emergencyContactPhone || '',
    emergencyContactRelation: party.emergencyContactRelation || '',
    notes: party.notes || '',
  };
}

function buildPartyPayload(data: FormData) {
  return {
    name: data.name,
    type: data.type,
    email: emptyToUndefined(data.email) ?? null,
    phone: emptyToUndefined(data.phone) ?? null,
    promotionSource: emptyToUndefined(data.promotionSource) ?? null,
    address: emptyToUndefined(data.address) ?? null,
    emergencyContactName: emptyToUndefined(data.emergencyContactName) ?? null,
    emergencyContactPhone: emptyToUndefined(data.emergencyContactPhone) ?? null,
    emergencyContactRelation: emptyToUndefined(data.emergencyContactRelation) ?? null,
    notes: emptyToUndefined(data.notes) ?? null,
  };
}

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
    defaultValues: editingParty ? partyToFormDefaults(editingParty) : { type: 'CUSTOMER', email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = buildPartyPayload(data);
      if (isEditing) {
        await api.put(`/parties/${editingParty.id}`, payload);
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
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
              <Input {...register('name')} placeholder="e.g. John Doe, ABC Suppliers" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Client Personal Details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input type="email" {...register('email')} placeholder="client@email.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...register('phone')} placeholder="e.g. +91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Source / Promotion</Label>
                <Input {...register('promotionSource')} placeholder="e.g. Instagram, Referral, Walk-in" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea {...register('address')} placeholder="Full address" rows={2} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Emergency Contact</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input {...register('emergencyContactName')} placeholder="Emergency contact name" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...register('emergencyContactPhone')} placeholder="Emergency phone" />
              </div>
              <div className="space-y-2">
                <Label>Relation</Label>
                <Input {...register('emergencyContactRelation')} placeholder="e.g. Spouse, Parent" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} placeholder="Optional notes" rows={2} />
          </div>

          <div className="flex gap-3">
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
      party.email?.toLowerCase().includes(q) ||
      party.promotionSource?.toLowerCase().includes(q) ||
      party.address?.toLowerCase().includes(q) ||
      party.emergencyContactName?.toLowerCase().includes(q) ||
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
                {party.email && <p className="text-sm text-muted-foreground mt-1">{party.email}</p>}
                {party.phone && <p className="text-sm text-muted-foreground">{party.phone}</p>}
                {party.promotionSource && (
                  <p className="text-xs text-muted-foreground mt-2">Source: {party.promotionSource}</p>
                )}
                {party.address && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{party.address}</p>
                )}
                {party.emergencyContactName && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Emergency: {party.emergencyContactName}
                    {party.emergencyContactRelation ? ` (${party.emergencyContactRelation})` : ''}
                    {party.emergencyContactPhone ? ` · ${party.emergencyContactPhone}` : ''}
                  </p>
                )}
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
            No parties found. Add clients, staff, or vendors with contact details.
          </div>
        )}
      </QueryState>
    </div>
  );
}
