'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Category } from '@/types';

interface CategorySelectFieldProps {
  type: 'INCOME' | 'EXPENSE';
  value?: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  parentGroups?: Category[];
  onCategoryAdded: () => void;
  error?: string;
}

export function CategorySelectField({
  type,
  value,
  onChange,
  categories,
  parentGroups = [],
  onCategoryAdded,
  error,
}: CategorySelectFieldProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState(parentGroups[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddCategory = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      setAddError('Name must be at least 2 characters');
      return;
    }
    if (parentGroups.length > 0 && !parentId) {
      setAddError('Select a category group');
      return;
    }

    setSaving(true);
    setAddError('');
    try {
      const created = await api.post<Category>('/categories', {
        name,
        type,
        ...(parentGroups.length > 0 ? { parentId } : {}),
      });
      onCategoryAdded();
      onChange(created.id);
      setNewName('');
      setShowAdd(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  if (showAdd) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
        <Label className="text-xs text-muted-foreground">New {type === 'INCOME' ? 'income' : 'expense'} category</Label>
        {parentGroups.length > 0 && (
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger>
              <SelectValue placeholder="Category group" />
            </SelectTrigger>
            <SelectContent>
              {parentGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder="Category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        {addError && <p className="text-xs text-destructive">{addError}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleAddCategory} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save category'}
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
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.parentId
                ? `${parentGroups.find((p) => p.id === c.parentId)?.name ?? ''} › ${c.name}`
                : c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-primary" onClick={() => setShowAdd(true)}>
        <Plus className="h-3 w-3" /> Add category
      </Button>
    </div>
  );
}
