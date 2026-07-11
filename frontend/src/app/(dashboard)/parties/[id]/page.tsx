'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MemberProfile } from '@/components/parties/member-profile';

function PartyDetailContent() {
  const params = useParams();
  const id = String(params.id || '');
  if (!id) return null;
  return <MemberProfile partyId={id} />;
}

export default function PartyDetailPage() {
  return (
    <Suspense>
      <PartyDetailContent />
    </Suspense>
  );
}
