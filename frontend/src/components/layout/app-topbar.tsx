'use client';

import { BusinessSwitcher } from '@/components/layout/business-switcher';
import { useAuthStore } from '@/stores/auth.store';

export function AppTopBar() {
  const { user } = useAuthStore();

  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <BusinessSwitcher />
      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold sm:block">
          {user?.name} · {user?.role?.toLowerCase()}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary sm:hidden">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </div>
  );
}
