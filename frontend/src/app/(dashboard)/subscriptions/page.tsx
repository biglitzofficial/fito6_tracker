'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { SubscriptionManager } from '@/components/subscriptions/subscription-manager';

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const autoOpenAdd = searchParams.get('action') === 'add';

  return (
    <div>
      <Header title="Subscriptions" subtitle="Add and renew gym memberships" />
      <div className="p-6">
        <SubscriptionManager
          kind="MEMBERSHIP"
          title="Membership Subscriptions"
          subtitle="Assign membership plans to clients with GST pricing and bill rep."
          autoOpenAdd={autoOpenAdd}
        />
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionsContent />
    </Suspense>
  );
}
