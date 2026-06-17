'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuthStore } from '@/stores/auth.store';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!user) fetchProfile();
  }, [token, user, router, fetchProfile]);

  if (!token) return null;

  return (
    <div className="min-h-screen gradient-mesh">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
