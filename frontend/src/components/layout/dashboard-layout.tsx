'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { AppTopBar } from '@/components/layout/app-topbar';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';

function AuthLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-secondary/50" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-32 bg-secondary/30" />
          ))}
        </div>
        <div className="glass rounded-2xl h-64 bg-secondary/30" />
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, hasHydrated, fetchProfile, setHasHydrated } = useAuthStore();
  const { activeBusinessId, isLoading, businesses, fetchBusinesses } = useBusinessStore();
  const [businessError, setBusinessError] = useState(false);

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

    fetchProfile().catch(() => undefined);
  }, [hasHydrated, token, router, fetchProfile]);

  useEffect(() => {
    if (!user || !token) return;
    setBusinessError(false);
    fetchBusinesses().catch(() => setBusinessError(true));
  }, [user, token, fetchBusinesses]);

  if (!hasHydrated || !token || !user || isLoading) {
    return <AuthLoading />;
  }

  if (businessError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold">Could not load businesses</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              setBusinessError(false);
              fetchBusinesses().catch(() => setBusinessError(true));
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!activeBusinessId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold">No business assigned</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {businesses.length
              ? 'Select a business from the top bar after signing in again.'
              : 'Your account is not linked to a gym yet. Contact your administrator.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-h-screen pl-[212px]">
        <AppTopBar />
        {children}
      </main>
    </div>
  );
}
