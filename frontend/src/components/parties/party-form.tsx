'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PARTY_TYPE_LABELS } from '@/components/forms/party-select-field';
import { api } from '@/lib/api';
import { GENDERS } from '@/lib/genders';
import {
  DEFAULT_PROMOTION_SOURCE,
  PROMOTION_SOURCES,
  isPromotionSource,
} from '@/lib/promotion-sources';
import type { Party, PartyType } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['STAFF', 'VENDOR', 'CUSTOMER', 'OTHER']),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  promotionSource: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  notes: z.string().optional(),
});

export type PartyFormData = z.infer<typeof schema>;

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function partyToFormDefaults(party: Party): PartyFormData {
  return {
    name: party.name,
    type: party.type,
    email: party.email || '',
    phone: party.phone || '',
    dateOfBirth: party.dateOfBirth || '',
    gender: party.gender || '',
    promotionSource: party.promotionSource || DEFAULT_PROMOTION_SOURCE,
    address: party.address || '',
    emergencyContactName: party.emergencyContactName || '',
    emergencyContactPhone: party.emergencyContactPhone || '',
    emergencyContactRelation: party.emergencyContactRelation || '',
    notes: party.notes || '',
  };
}

function promotionSourceOptions(current?: string | null) {
  if (current && !isPromotionSource(current)) {
    return [current, ...PROMOTION_SOURCES];
  }
  return [...PROMOTION_SOURCES];
}

export function buildPartyPayload(data: PartyFormData) {
  return {
    name: data.name,
    type: data.type,
    email: emptyToUndefined(data.email) ?? null,
    phone: emptyToUndefined(data.phone) ?? null,
    dateOfBirth: emptyToUndefined(data.dateOfBirth) ?? null,
    gender: emptyToUndefined(data.gender) ?? null,
    promotionSource: emptyToUndefined(data.promotionSource) ?? null,
    address: emptyToUndefined(data.address) ?? null,
    emergencyContactName: emptyToUndefined(data.emergencyContactName) ?? null,
    emergencyContactPhone: emptyToUndefined(data.emergencyContactPhone) ?? null,
    emergencyContactRelation: emptyToUndefined(data.emergencyContactRelation) ?? null,
    notes: emptyToUndefined(data.notes) ?? null,
  };
}

interface PartyFormProps {
  editingParty?: Party | null;
  onCancel: () => void;
  onSaved: (party?: Party) => void;
  compact?: boolean;
  /** Force CUSTOMER and hide party type field (wizard) */
  forceCustomer?: boolean;
  hideCancel?: boolean;
  submitLabel?: string;
}

export function PartyForm({
  editingParty,
  onCancel,
  onSaved,
  compact,
  forceCustomer,
  hideCancel,
  submitLabel,
}: PartyFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!editingParty;

  const { register, handleSubmit, control, formState: { errors } } = useForm<PartyFormData>({
    resolver: zodResolver(schema),
    defaultValues: editingParty
      ? partyToFormDefaults(editingParty)
      : {
          type: 'CUSTOMER',
          email: '',
          dateOfBirth: '',
          gender: '',
          promotionSource: DEFAULT_PROMOTION_SOURCE,
        },
  });

  const sourceOptions = promotionSourceOptions(editingParty?.promotionSource);

  const onSubmit = async (data: PartyFormData) => {
    setSubmitting(true);
    try {
      const payload = buildPartyPayload({
        ...data,
        type: forceCustomer ? 'CUSTOMER' : data.type,
      });
      const party = isEditing
        ? await api.put<Party>(`/parties/${editingParty.id}`, payload)
        : await api.post<Party>('/parties', payload);
      onSaved(party);
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {!forceCustomer && (
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
        )}
        <div className={forceCustomer ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
          <Label>Name</Label>
          <Input {...register('name')} placeholder="e.g. John Doe, ABC Suppliers" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Personal Information</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input {...register('phone')} placeholder="e.g. +91 98765 43210" />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input type="email" {...register('email')} placeholder="client@email.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" {...register('dateOfBirth')} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not set</SelectItem>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Source Promotion</Label>
            <Controller
              name="promotionSource"
              control={control}
              render={({ field }) => (
                <Select value={field.value || DEFAULT_PROMOTION_SOURCE} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            submitLabel || (isEditing ? 'Save Changes' : 'Save Party')
          )}
        </Button>
        {!hideCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );

  if (compact) return form;

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{isEditing ? 'Edit Party' : 'New Party (Contact)'}</h3>
        {form}
      </CardContent>
    </Card>
  );
}
