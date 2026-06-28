'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AccountsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    router.replace(`/entry-fields?tab=payment-modes${action === 'add' ? '&action=add' : ''}`);
  }, [router, searchParams]);

  return null;
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsRedirect />
    </Suspense>
  );
}
