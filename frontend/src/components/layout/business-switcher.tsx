'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Search, Check, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessStore } from '@/stores/business.store';
import { cn } from '@/lib/utils';

export function BusinessSwitcher() {
  const queryClient = useQueryClient();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const {
    businesses,
    activeBusinessId,
    isLoading,
    setActiveBusiness,
    createBusiness,
  } = useBusinessStore();

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return businesses;
    const q = search.toLowerCase();
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, search]);

  const closeMenu = () => {
    setOpen(false);
    setSearch('');
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setNewName('');
    setError('');
  };

  const switchBusiness = (id: string) => {
    if (id === activeBusinessId) {
      closeMenu();
      return;
    }
    setActiveBusiness(id);
    queryClient.clear();
    closeMenu();
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setError('Business name must be at least 2 characters');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await createBusiness(trimmed);
      queryClient.clear();
      closeAddModal();
      closeMenu();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create business');
    } finally {
      setCreating(false);
    }
  };

  const menu = open && menuStyle && mounted ? (
    <>
      <div className="fixed inset-0 z-[200] bg-black/40" onClick={closeMenu} aria-hidden />
      <div
        className="fixed z-[201] rounded-xl border border-border bg-white shadow-xl overflow-hidden"
        style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Business"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto py-1">
          {filtered.map((business) => {
            const selected = business.id === activeBusinessId;
            return (
              <button
                key={business.id}
                type="button"
                onClick={() => switchBusiness(business.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent/50',
                  selected && 'bg-primary/10'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="truncate uppercase">{business.name}</span>
              </button>
            );
          })}
          {!filtered.length && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No businesses found</p>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Button
            className="w-full"
            onClick={() => {
              closeMenu();
              setShowAdd(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add New Business
          </Button>
        </div>
      </div>
    </>
  ) : null;

  const addModal = showAdd && mounted ? (
    <>
      <div className="fixed inset-0 z-[210] bg-black/50" onClick={closeAddModal} aria-hidden />
      <div className="fixed inset-0 z-[211] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Add New Business</h3>
            <Button type="button" variant="ghost" size="icon" onClick={closeAddModal}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <Label>Business Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. FITO6 FITNESS STUDIO"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={creating} className="flex-1">
                {creating ? 'Creating...' : 'Create Business'}
              </Button>
              <Button variant="ghost" onClick={closeAddModal}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent/50 transition-colors max-w-[280px]"
      >
        <span className="truncate uppercase tracking-wide">
          {isLoading ? 'Loading...' : activeBusiness?.name || 'Select Business'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {mounted && menu && createPortal(menu, document.body)}
      {mounted && addModal && createPortal(addModal, document.body)}
    </>
  );
}
