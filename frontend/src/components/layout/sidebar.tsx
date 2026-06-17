'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  BarChart3,
  Settings,
  Bell,
  ScrollText,
  FolderOpen,
  LogOut,
  ChevronLeft,
  Dumbbell,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const staffNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/attendance', label: 'Attendance', icon: Calendar },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/reports', label: 'Reports', icon: FileText },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const nav = isAdmin(user) ? adminNav : staffNav;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border glass-strong transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
          <Dumbbell className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-sm">Fito6</h1>
            <p className="text-xs text-muted-foreground">Finance Tracker</p>
          </div>
        )}
        {onToggle && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onToggle}>
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto scrollbar-thin">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/15 text-primary-foreground border border-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
          </div>
        )}
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </aside>
  );
}
