'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  BookOpen,
  Scale,
  ListChecks,
  CreditCard,
  UserCheck,
  UserRound,
  Receipt,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefetchRoute, useStaffAccess } from '@/hooks/use-api-query';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { mergeStaffAccess } from '@/lib/staff-access';
import { Button } from '@/components/ui/button';

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: UserRound },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/ledger', label: 'Cashbook', icon: BookOpen },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: Calendar },
  { href: '/payroll', label: 'Payroll', icon: Banknote },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/profit-loss', label: 'Accounts', icon: Scale },
  { href: '/audit-logs', label: 'Audit Log', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/personal-training', label: 'Personal Training', icon: UserCheck },
  { href: '/entry-fields', label: 'Entry Fields', icon: ListChecks },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

const staffNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: UserRound },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/attendance', label: 'Attendance', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/personal-training', label: 'Personal Training', icon: UserCheck },
  { href: '/entry-fields', label: 'Entry Fields', icon: ListChecks },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const activeBusiness = useBusinessStore((s) =>
    s.businesses.find((b) => b.id === s.activeBusinessId)
  );
  const { data: staffAccessData } = useStaffAccess();
  const staffAccess = mergeStaffAccess(staffAccessData);
  const nav = isAdmin(user)
    ? adminNav
    : staffNav.filter((item) =>
        item.href === '/reports' ? !staffAccess.hideNetBalanceAndReports : true
      );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#141b2d] text-[#cfd6e4] transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[212px]'
      )}
    >
      <div className="flex h-[70px] items-center gap-2 border-b border-white/10 px-4">
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-extrabold tracking-wide text-white">
              FITO<span className="text-primary">6</span>
            </h1>
            <p className="truncate text-[11px] text-[#7f8aa3]">
              {activeBusiness?.name || 'Gym Management'}
            </p>
          </div>
        ) : (
          <div className="mx-auto text-sm font-extrabold text-white">
            F<span className="text-primary">6</span>
          </div>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-[#cfd6e4] hover:bg-[#1d2740] hover:text-white"
            onClick={onToggle}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => prefetchRoute(queryClient, item.href)}
              className={cn(
                'flex items-center gap-2.5 border-l-[3px] px-3 py-2.5 text-[13px] transition-colors',
                active
                  ? 'border-primary bg-[#1d2740] font-semibold text-white'
                  : 'border-transparent text-[#cfd6e4] hover:bg-[#1d2740]'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="text-[11px] capitalize text-[#7f8aa3]">{user.role.toLowerCase()}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-[#cfd6e4] hover:bg-[#1d2740] hover:text-white"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </aside>
  );
}
