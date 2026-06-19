'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (!isAdmin(user)) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, user, router]);

  if (!hasHydrated || !user) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-secondary/50" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-40 bg-secondary/30" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin(user)) return null;
  return <>{children}</>;
}
