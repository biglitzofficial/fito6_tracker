'use client';

import { useState } from 'react';
import { Pencil, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PARTY_TYPE_LABELS } from '@/components/forms/party-select-field';
import { api } from '@/lib/api';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Party, PartyType } from '@/types';

interface PartyManagerProps {
  parties: Party[];
  onUpdated: () => void;
}

function PartyRow({ party, onUpdated }: { party: Party; onUpdated: () => void }) {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(party.name);
  const [type, setType] = useState<PartyType>(party.type);
  const [phone, setPhone] = useState(party.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveEdit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.put(`/parties/${party.id}`, {
        name: trimmed,
        type,
        phone: phone.trim() || null,
      });
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update party');
    } finally {
      setSaving(false);
    }
  };

  const disableParty = async () => {
    if (!confirm(`Disable "${party.name}"?`)) return;
    await api.delete(`/parties/${party.id}`);
    onUpdated();
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Select value={type} onValueChange={(v) => setType(v as PartyType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PARTY_TYPE_LABELS) as PartyType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {PARTY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="max-w-[160px]"
        />
        {error && <p className="w-full text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={saveEdit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
      <div>
        <span className="text-sm font-medium">{party.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{PARTY_TYPE_LABELS[party.type]}</span>
        {party.phone && <span className="ml-2 text-xs text-muted-foreground">{party.phone}</span>}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setName(party.name);
            setType(party.type);
            setPhone(party.phone || '');
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        {isAdmin(user) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={disableParty}
          >
            Disable
          </Button>
        )}
      </div>
    </div>
  );
}

export function PartyManager({ parties, onUpdated }: PartyManagerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Parties (Contacts)</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Manage
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-2">
          {!parties.length && (
            <p className="text-sm text-muted-foreground">No parties yet. Add staff or vendors when recording expenses.</p>
          )}
          {parties.map((party) => (
            <PartyRow key={party.id} party={party} onUpdated={onUpdated} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
