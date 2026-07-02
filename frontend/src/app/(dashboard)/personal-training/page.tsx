'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { SubscriptionManager } from '@/components/subscriptions/subscription-manager';

function PersonalTrainingContent() {
  const searchParams = useSearchParams();
  const autoOpenAdd = searchParams.get('action') === 'add';

  return (
    <div>
      <Header title="Personal Training" subtitle="Assign and renew personal training packages" />
      <div className="p-6">
        <SubscriptionManager
          kind="PERSONAL_TRAINING"
          title="Personal Training"
          subtitle="Assign PT plans to clients with trainer, GST pricing, and bill rep."
          autoOpenAdd={autoOpenAdd}
        />
      </div>
    </div>
  );
}

export default function PersonalTrainingPage() {
  return (
    <Suspense>
      <PersonalTrainingContent />
    </Suspense>
  );
}
