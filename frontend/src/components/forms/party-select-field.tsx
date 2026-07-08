'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Party, PartyType } from '@/types';

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  STAFF: 'Staff',
  VENDOR: 'Vendor',
  CUSTOMER: 'Customer',
  OTHER: 'Other',
};

interface PartySelectFieldProps {
  value?: string;
  onChange: (partyId: string) => void;
  parties: Party[];
  onPartyAdded: () => void;
  defaultType?: PartyType;
  error?: string;
  variant?: 'party' | 'client';
}

export function PartySelectField({
  value,
  onChange,
  parties,
  onPartyAdded,
  defaultType = 'STAFF',
  error,
  variant = 'party',
}: PartySelectFieldProps) {
  const isClient = variant === 'client';
  const newLabel = isClient ? 'New client' : 'New party (contact)';
  const typePlaceholder = isClient ? 'Client type' : 'Party type';
  const namePlaceholder = isClient
    ? 'Client name (e.g. Rahul Sharma)'
    : 'Party name (e.g. KASTHURI-MAID)';
  const selectPlaceholder = isClient ? 'Search or select client' : 'Search or select party';
  const addLabel = isClient ? 'Add client' : 'Add party';
  const saveLabel = isClient ? 'Save client' : 'Save party';
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PartyType>(defaultType);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddParty = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      setAddError('Name must be at least 2 characters');
      return;
    }

    setSaving(true);
    setAddError('');
    try {
      const created = await api.post<Party>('/parties', {
        name,
        type: newType,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      onPartyAdded();
      onChange(created.id);
      setNewName('');
      setPhone('');
      setShowAdd(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add party');
    } finally {
      setSaving(false);
    }
  };

  if (showAdd) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
        <Label className="text-xs text-muted-foreground">{newLabel}</Label>
        <Select value={newType} onValueChange={(v) => setNewType(v as PartyType)}>
          <SelectTrigger>
            <SelectValue placeholder={typePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PARTY_TYPE_LABELS) as PartyType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {PARTY_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={namePlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {addError && <p className="text-xs text-destructive">{addError}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleAddParty} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveLabel}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {parties.map((party) => (
            <SelectItem key={party.id} value={party.id}>
              {party.name} · {PARTY_TYPE_LABELS[party.type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-primary"
        onClick={() => {
          setNewType(defaultType);
          setShowAdd(true);
        }}
      >
        <Plus className="h-3 w-3" /> {addLabel}
      </Button>
    </div>
  );
}
