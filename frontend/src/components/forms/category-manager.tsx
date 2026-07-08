'use client';

import { useState } from 'react';
import { Pencil, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Category } from '@/types';

interface CategoryManagerProps {
  type: 'INCOME' | 'EXPENSE';
  categories: Category[];
  onUpdated: () => void;
  embedded?: boolean;
}

function CategoryRow({
  category,
  parentGroups,
  showParentSelect,
  groupName,
  onUpdated,
}: {
  category: Category;
  parentGroups?: Category[];
  showParentSelect?: boolean;
  groupName?: string;
  onUpdated: () => void;
}) {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setName(category.name);
    setParentId(category.parentId || parentGroups?.[0]?.id || '');
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setName(category.name);
    setParentId(category.parentId || '');
    setError('');
    setEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (showParentSelect && !parentId) {
      setError('Select a category group');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.put(`/categories/${category.id}`, {
        name: trimmed,
        ...(showParentSelect ? { parentId } : {}),
      });
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const disableCategory = async () => {
    if (!confirm(`Disable "${category.name}"?`)) return;
    await api.delete(`/categories/${category.id}`);
    onUpdated();
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        {showParentSelect && parentGroups && parentGroups.length > 0 && (
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
        )}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
          placeholder="Category name"
        />
        {error && <p className="w-full text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={saveEdit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
      <span className="text-sm">
        {groupName ? `${groupName} › ${category.name}` : category.name}
      </span>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={startEdit}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        {isAdmin(user) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={disableCategory}
          >
            Disable
          </Button>
        )}
      </div>
    </div>
  );
}

export function CategoryManager({ type, categories, onUpdated, embedded }: CategoryManagerProps) {
  const [expanded, setExpanded] = useState(embedded ?? false);

  const parentGroups = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">
            {type === 'INCOME' ? 'Income Categories' : 'Expense Categories'}
          </CardTitle>
          {!embedded && (
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
          )}
        </div>
      </CardHeader>
      {(embedded || expanded) && (
        <CardContent className="space-y-4">
          {type === 'INCOME' && (
            <div className="space-y-4">
              {parentGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Group
                  </Label>
                  <CategoryRow category={group} onUpdated={onUpdated} />
                  <div className="ml-4 space-y-2">
                    {childCategories
                      .filter((c) => c.parentId === group.id)
                      .map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          parentGroups={parentGroups}
                          groupName={group.name}
                          showParentSelect
                          onUpdated={onUpdated}
                        />
                      ))}
                  </div>
                </div>
              ))}
              {!parentGroups.length && (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              )}
            </div>
          )}

          {type === 'EXPENSE' && (
            <div className="space-y-4">
              {parentGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Group
                  </Label>
                  <CategoryRow category={group} onUpdated={onUpdated} />
                  <div className="ml-4 space-y-2">
                    {childCategories
                      .filter((c) => c.parentId === group.id)
                      .map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          parentGroups={parentGroups}
                          groupName={group.name}
                          showParentSelect
                          onUpdated={onUpdated}
                        />
                      ))}
                  </div>
                </div>
              ))}
              {!parentGroups.length && (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
