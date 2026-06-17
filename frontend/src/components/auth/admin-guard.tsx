'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !isAdmin(user)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || !isAdmin(user)) return null;
  return <>{children}</>;
}
