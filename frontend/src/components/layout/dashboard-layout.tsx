'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuthStore } from '@/stores/auth.store';

function AuthLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-48 rounded-xl bg-secondary/50" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl h-32 bg-secondary/30" />
        ))}
      </div>
      <div className="glass rounded-2xl h-64 bg-secondary/30" />
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, hasHydrated, fetchProfile, setHasHydrated } = useAuthStore();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }

    return useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!user) fetchProfile();
  }, [hasHydrated, token, user, router, fetchProfile]);

  if (!hasHydrated || !token) {
    return (
      <div className="min-h-screen gradient-mesh">
        <main className="pl-64 min-h-screen">
          <AuthLoading />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
