'use client';

import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  UserRound,
  LayoutDashboard,
  BadgeCheck,
  Receipt,
  Pencil,
  RefreshCw,
  Dumbbell,
  FileText,
  History,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Megaphone,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { PartyForm } from '@/components/parties/party-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/ui/query-state';
import { useApiQuery, useInvalidate, useParty, useSubscriptions } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getMembershipBadgeStatus,
  getPaymentStatus,
  membershipBadgeVariant,
  paymentStatusVariant,
  pickCurrentSubscription,
  sessionsRemaining,
} from '@/lib/member-status';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PARTY_TYPE_LABELS } from '@/components/forms/party-select-field';
import type { Income } from '@/types';

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/35">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="text-sm font-medium text-foreground break-words">{value || '—'}</p>
    </div>
  );
}

function StatusTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 transition-all hover:border-primary/30 hover:bg-primary/5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-base font-semibold">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="transition-shadow hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface MemberProfileProps {
  partyId: string;
}

export function MemberProfile({ partyId }: MemberProfileProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [showInvoice, setShowInvoice] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: party, isLoading, isError, error, refetch } = useParty(partyId);
  const { data: memberships = [] } = useSubscriptions('MEMBERSHIP', partyId);
  const { data: trainings = [] } = useSubscriptions('PERSONAL_TRAINING', partyId);
  const { data: incomePage } = useApiQuery<{ items: Income[] }>(
    ['income', 'party', partyId],
    `/income?partyId=${partyId}&limit=50`,
    { enabled: !!partyId }
  );

  const membership = useMemo(() => pickCurrentSubscription(memberships), [memberships]);
  const training = useMemo(() => pickCurrentSubscription(trainings), [trainings]);
  const payments = incomePage?.items ?? [];

  const membershipStatus = getMembershipBadgeStatus(membership);
  const ptStatus = getMembershipBadgeStatus(training);
  const remaining = sessionsRemaining(training);

  const totalAmount = membership ? Number(membership.priceInclGst) : 0;
  const receivedAmount = membership ? Number(membership.amountPaid) : 0;
  const balanceAmount = Math.max(0, totalAmount - receivedAmount);
  const paymentStatus = membership ? getPaymentStatus(totalAmount, receivedAmount) : null;

  const emergencyContact = party
    ? [
        party.emergencyContactName,
        party.emergencyContactRelation ? `(${party.emergencyContactRelation})` : null,
        party.emergencyContactPhone,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const refresh = () => {
    invalidate(queryKeys.party(partyId));
    invalidate(queryKeys.parties());
    invalidate(queryKeys.subscriptions('MEMBERSHIP', partyId));
    invalidate(queryKeys.subscriptions('PERSONAL_TRAINING', partyId));
    invalidate(['income', 'party', partyId]);
  };

  return (
    <div>
      <Header
        title={party?.name || 'Member Profile'}
        subtitle={party ? `${PARTY_TYPE_LABELS[party.type]} · Client details` : 'Loading member…'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/entry-fields?tab=parties')}>
            <ArrowLeft className="h-4 w-4" /> Back to Members
          </Button>
        }
      />

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasData={!!party}
          onRetry={() => refetch()}
        >
          {party && (
            <>
              {/* Section 1 */}
              <Panel
                title="Personal Information"
                icon={UserRound}
                action={
                  !editing ? (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : null
                }
              >
                {editing ? (
                  <PartyForm
                    compact
                    editingParty={party}
                    onCancel={() => setEditing(false)}
                    onSaved={() => {
                      setEditing(false);
                      refresh();
                    }}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow label="Name" value={party.name} icon={UserRound} />
                    <InfoRow label="Contact Number" value={party.phone} icon={Phone} />
                    <InfoRow label="Email Address" value={party.email} icon={Mail} />
                    <InfoRow
                      label="Date of Birth"
                      value={party.dateOfBirth ? formatDate(party.dateOfBirth) : null}
                      icon={Calendar}
                    />
                    <InfoRow label="Gender" value={party.gender} icon={Users} />
                    <InfoRow label="Source Promotion" value={party.promotionSource} icon={Megaphone} />
                    <InfoRow label="Address" value={party.address} icon={MapPin} />
                    <InfoRow label="Emergency Contact" value={emergencyContact} icon={Phone} />
                  </div>
                )}
              </Panel>

              {/* Section 2 */}
              <Panel title="Client Dashboard" icon={LayoutDashboard}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatusTile
                    label="Membership Status"
                    value={
                      <Badge variant={membershipBadgeVariant(membershipStatus)}>
                        {membershipStatus === 'None' ? 'No membership' : membershipStatus}
                      </Badge>
                    }
                  />
                  <StatusTile
                    label="Current Membership Plan"
                    value={membership?.planName || '—'}
                  />
                  <StatusTile
                    label="Subscription Expiry"
                    value={membership ? formatDate(membership.endDate) : '—'}
                  />
                  <StatusTile
                    label="Personal Training Status"
                    value={
                      <Badge variant={membershipBadgeVariant(ptStatus)}>
                        {ptStatus === 'None' ? 'No PT' : ptStatus}
                      </Badge>
                    }
                  />
                  <StatusTile
                    label="Trainer Name"
                    value={training?.trainer?.name || '—'}
                  />
                  <StatusTile
                    label="Remaining PT Sessions"
                    value={remaining === null ? '—' : remaining}
                    hint={training?.sessionsTotal != null ? `of ${training.sessionsTotal} total` : undefined}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    disabled={!membership}
                    onClick={() =>
                      membership && router.push(`/subscriptions?renew=${membership.id}`)
                    }
                  >
                    <RefreshCw className="h-4 w-4" /> Renew Membership
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!training}
                    onClick={() =>
                      training && router.push(`/personal-training?renew=${training.id}`)
                    }
                  >
                    <Dumbbell className="h-4 w-4" /> Renew Personal Training
                  </Button>
                  {!membership && (
                    <Button variant="ghost" asChild>
                      <Link href="/subscriptions?action=add">Assign Membership</Link>
                    </Button>
                  )}
                  {!training && (
                    <Button variant="ghost" asChild>
                      <Link href="/personal-training?action=add">Assign PT</Link>
                    </Button>
                  )}
                </div>
              </Panel>

              {/* Section 3 */}
              <Panel title="Membership Plan" icon={BadgeCheck}>
                {membership ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={membershipBadgeVariant(membershipStatus)}>
                        {membershipStatus}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{membership.planName}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoRow label="Membership Plan" value={membership.planName} />
                      <InfoRow label="Start Date" value={formatDate(membership.startDate)} />
                      <InfoRow label="End Date" value={formatDate(membership.endDate)} />
                      <InfoRow
                        label="Selling Price"
                        value={formatCurrency(Number(membership.priceInclGst))}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No membership assigned yet.{' '}
                    <Link href="/subscriptions?action=add" className="text-primary hover:underline">
                      Add a subscription
                    </Link>
                  </p>
                )}
              </Panel>

              {/* Section 4 */}
              <Panel title="Billing Details" icon={Receipt}>
                {membership ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border bg-muted/20 p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                          <p className="text-lg font-semibold">
                            {membership.receiptNumber || 'No receipt yet'}
                          </p>
                        </div>
                        {paymentStatus && (
                          <Badge variant={paymentStatusVariant(paymentStatus)}>{paymentStatus}</Badge>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoRow label="Bill Number" value={membership.receiptNumber || '—'} />
                        <InfoRow label="Membership Plan" value={membership.planName} />
                        <InfoRow label="Total Amount" value={formatCurrency(totalAmount)} />
                        <InfoRow label="Received Amount" value={formatCurrency(receivedAmount)} />
                        <InfoRow
                          label="Balance Amount"
                          value={
                            <span className={balanceAmount > 0 ? 'text-warning font-semibold' : undefined}>
                              {formatCurrency(balanceAmount)}
                            </span>
                          }
                        />
                        <InfoRow label="Payment Status" value={paymentStatus} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setShowInvoice((v) => !v)}>
                        <FileText className="h-4 w-4" /> View Invoice
                      </Button>
                      <Button variant="outline" onClick={() => setShowHistory((v) => !v)}>
                        <History className="h-4 w-4" /> Payment History
                      </Button>
                    </div>

                    {showInvoice && (
                      <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Invoice Summary</h4>
                          <Badge variant="secondary">{membership.receiptNumber || 'Draft'}</Badge>
                        </div>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          <p><span className="text-muted-foreground">Client:</span> {party.name}</p>
                          <p><span className="text-muted-foreground">Plan:</span> {membership.planName}</p>
                          <p><span className="text-muted-foreground">Period:</span> {formatDate(membership.startDate)} → {formatDate(membership.endDate)}</p>
                          <p><span className="text-muted-foreground">Bill Rep:</span> {membership.billRep?.name || '—'}</p>
                          <p><span className="text-muted-foreground">Total:</span> {formatCurrency(totalAmount)}</p>
                          <p><span className="text-muted-foreground">Paid:</span> {formatCurrency(receivedAmount)}</p>
                          <p className={balanceAmount > 0 ? 'text-warning font-medium' : undefined}>
                            <span className="text-muted-foreground">Balance:</span> {formatCurrency(balanceAmount)}
                          </p>
                        </div>
                      </div>
                    )}

                    {showHistory && (
                      <div className="animate-fade-in rounded-xl border border-border overflow-hidden">
                        <div className="border-b border-border bg-muted/30 px-4 py-3">
                          <h4 className="font-semibold text-sm">Payment History</h4>
                        </div>
                        {payments.length ? (
                          <div className="divide-y divide-border">
                            {payments.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/20"
                              >
                                <div>
                                  <p className="font-medium">{item.receiptNumber || 'Payment'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(item.date)}
                                    {item.category?.name ? ` · ${item.category.name}` : ''}
                                  </p>
                                </div>
                                <p className="font-semibold text-success">{formatCurrency(Number(item.amount))}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="p-4 text-sm text-muted-foreground">No payments recorded for this client yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Billing appears once a membership subscription is assigned.
                  </p>
                )}
              </Panel>
            </>
          )}
        </QueryState>
      </div>
    </div>
  );
}
