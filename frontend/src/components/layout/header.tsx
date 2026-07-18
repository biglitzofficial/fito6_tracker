'use client';

import { useState, type ReactNode } from 'react';
import { Search, Command } from 'lucide-react';
import { CommandPalette } from '@/components/layout/command-palette';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {actions}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex max-w-[340px] items-center gap-2 rounded-md border border-[#cdd5e1] bg-white px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search name / phone / invoice…</span>
            <kbd className="hidden md:inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px]">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <div className="hidden items-center rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold sm:flex">
            {user?.name || 'User'}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary sm:hidden">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
