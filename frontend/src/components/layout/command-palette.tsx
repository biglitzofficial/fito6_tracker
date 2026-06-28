'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  CheckSquare,
  BarChart3,
  FileText,
  Settings,
  BookOpen,
  Scale,
  ListChecks,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const admin = isAdmin(user);

  const commands = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Add Income', href: '/income?action=add', icon: TrendingUp },
    { label: 'Add Expense', href: '/expenses?action=add', icon: TrendingDown },
    { label: 'Entry Fields', href: '/entry-fields', icon: ListChecks },
    { label: 'Add Party', href: '/entry-fields?tab=parties&action=add', icon: ListChecks },
    { label: 'Mark Attendance', href: '/attendance', icon: Calendar },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    ...(admin
      ? [
          { label: 'Staff Management', href: '/staff', icon: Users },
          { label: 'Ledger', href: '/ledger', icon: BookOpen },
          { label: 'Profit & Loss', href: '/profit-loss', icon: Scale },
          { label: 'Analytics', href: '/analytics', icon: BarChart3 },
          { label: 'Reports', href: '/reports', icon: FileText },
          { label: 'Settings', href: '/settings', icon: Settings },
        ]
      : []),
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <Command className="relative z-50 w-full max-w-lg glass-strong rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center border-b border-border px-4">
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
          <Command.Group heading="Navigation" className="text-xs text-muted-foreground px-2 py-1.5">
            {commands.map((cmd) => (
              <Command.Item
                key={cmd.href}
                onSelect={() => {
                  router.push(cmd.href);
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent"
              >
                <cmd.icon className="h-4 w-4 text-muted-foreground" />
                {cmd.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
