'use client';

import { useState } from 'react';
import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/layout/command-palette';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border glass-strong px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
