'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PartiesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    router.replace(`/entry-fields?tab=parties${action === 'add' ? '&action=add' : ''}`);
  }, [router, searchParams]);

  return null;
}

export default function PartiesPage() {
  return (
    <Suspense>
      <PartiesRedirect />
    </Suspense>
  );
}
