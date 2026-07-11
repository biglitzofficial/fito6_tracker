import type { Subscription } from '@/types';

const EXPIRING_SOON_DAYS = 14;

export type MembershipBadgeStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled' | 'None';

export function daysUntil(date: string | Date) {
  const end = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMembershipBadgeStatus(sub?: Subscription | null): MembershipBadgeStatus {
  if (!sub) return 'None';
  if (sub.status === 'CANCELLED') return 'Cancelled';
  if (sub.status === 'EXPIRED') return 'Expired';
  const days = daysUntil(sub.endDate);
  if (days < 0) return 'Expired';
  if (days <= EXPIRING_SOON_DAYS) return 'Expiring Soon';
  return 'Active';
}

export function membershipBadgeVariant(
  status: MembershipBadgeStatus
): 'success' | 'warning' | 'destructive' | 'secondary' | 'default' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Expiring Soon':
      return 'warning';
    case 'Expired':
    case 'Cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function getPaymentStatus(total: number, received: number): 'Paid' | 'Partial' | 'Unpaid' {
  if (received <= 0) return 'Unpaid';
  if (received + 0.001 >= total) return 'Paid';
  return 'Partial';
}

export function paymentStatusVariant(
  status: 'Paid' | 'Partial' | 'Unpaid'
): 'success' | 'warning' | 'destructive' {
  if (status === 'Paid') return 'success';
  if (status === 'Partial') return 'warning';
  return 'destructive';
}

export function pickCurrentSubscription(items: Subscription[]) {
  const active = items.find((s) => s.status === 'ACTIVE');
  if (active) return active;
  return items[0] ?? null;
}

export function sessionsRemaining(sub?: Subscription | null) {
  if (!sub?.sessionsTotal && sub?.sessionsTotal !== 0) return null;
  return Math.max(0, (sub.sessionsTotal || 0) - (sub.sessionsUsed || 0));
}
