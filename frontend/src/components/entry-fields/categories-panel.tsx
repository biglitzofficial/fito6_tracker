'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryManager } from '@/components/forms/category-manager';
import { api } from '@/lib/api';
import { useCategories, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import type { Category } from '@/types';

function AddCategoryForm({
  type,
  parentGroups,
  onAdded,
}: {
  type: 'INCOME' | 'EXPENSE';
  parentGroups: Category[];
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(parentGroups[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (type === 'EXPENSE' && !parentId) {
      setError('Select a category group');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/categories', {
        name: trimmed,
        type,
        ...(type === 'EXPENSE' ? { parentId } : {}),
      });
      setName('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      {type === 'EXPENSE' && parentGroups.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Group</Label>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              {parentGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1 flex-1 min-w-[200px]">
        <Label className="text-xs">New category name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
      </div>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
      <Button type="button" size="sm" onClick={handleAdd} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </Button>
    </div>
  );
}

export function CategoriesPanel() {
  const invalidate = useInvalidate();
  const { data: incomeCategories = [] } = useCategories('INCOME');
  const { data: expenseCategories = [] } = useCategories('EXPENSE');
  const expenseGroups = expenseCategories.filter((c) => !c.parentId);

  const refresh = (type: 'INCOME' | 'EXPENSE') => {
    invalidate(queryKeys.categories(type));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">Rename, disable, or add income and expense categories.</p>
      </div>
      <CategoryManager
        type="INCOME"
        categories={incomeCategories}
        onUpdated={() => refresh('INCOME')}
        embedded
      />
      <AddCategoryForm type="INCOME" parentGroups={[]} onAdded={() => refresh('INCOME')} />
      <CategoryManager
        type="EXPENSE"
        categories={expenseCategories}
        onUpdated={() => refresh('EXPENSE')}
        embedded
      />
      <AddCategoryForm
        type="EXPENSE"
        parentGroups={expenseGroups}
        onAdded={() => refresh('EXPENSE')}
      />
    </div>
  );
}
