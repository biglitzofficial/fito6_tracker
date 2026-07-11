'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QueryState } from '@/components/ui/query-state';
import { PartySelectField } from '@/components/forms/party-select-field';
import { AccountSelectField } from '@/components/forms/account-select-field';
import { PLAN_KIND_LABELS } from '@/components/entry-fields/membership-plans-panel';
import { api } from '@/lib/api';
import { addDays, toDateInput } from '@/lib/gst';
import {
  useApiQuery,
  useMembershipPlans,
  useSubscriptions,
  useParties,
  useAccounts,
  useInvalidate,
} from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import type { MembershipPlan, PlanKind, Subscription, SubscriptionStatus, User } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<SubscriptionStatus, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  CANCELLED: 'destructive',
};

function buildSchema(kind: PlanKind) {
  return z.object({
    partyId: z.string().min(1, 'Select a client'),
    planId: z.string().min(1, 'Select a plan'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    amountPaid: z.coerce.number().positive('Amount must be positive'),
    billRepId: z.string().optional(),
    trainerStaffId: kind === 'PERSONAL_TRAINING' ? z.string().min(1, 'Select a trainer') : z.string().optional(),
    accountId: z.string().optional(),
    notes: z.string().optional(),
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

function SubscriptionForm({
  kind,
  plans,
  parties,
  accounts,
  staff,
  renewing,
  onCancel,
  onSaved,
  onPartyAdded,
  onAccountAdded,
}: {
  kind: PlanKind;
  plans: MembershipPlan[];
  parties: import('@/types').Party[];
  accounts: import('@/types').Account[];
  staff: User[];
  renewing?: Subscription | null;
  onCancel: () => void;
  onSaved: () => void;
  onPartyAdded: () => void;
  onAccountAdded: () => void;
}) {
  const isRenew = !!renewing;
  const schema = useMemo(() => buildSchema(kind), [kind]);
  const today = toDateInput(new Date());
  const defaultStart = renewing
    ? toDateInput(addDays(new Date(Math.max(new Date(renewing.endDate).getTime(), Date.now())), 1))
    : today;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: renewing
      ? {
          partyId: renewing.partyId,
          planId: renewing.planId,
          startDate: defaultStart,
          endDate: '',
          amountPaid: renewing.amountPaid,
          billRepId: renewing.billRepId || undefined,
          trainerStaffId: renewing.trainerStaffId || undefined,
          accountId: renewing.accountId || undefined,
          notes: '',
        }
      : { startDate: today, endDate: '', amountPaid: 0 },
  });

  const planId = watch('planId');
  const startDate = watch('startDate');
  const selectedPlan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (!selectedPlan || !startDate) return;
    const end = toDateInput(addDays(new Date(startDate), selectedPlan.durationDays - 1));
    setValue('endDate', end);
    if (!isRenew) setValue('amountPaid', selectedPlan.priceInclGst);
  }, [selectedPlan, startDate, setValue, isRenew]);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        kind,
        partyId: data.partyId,
        planId: data.planId,
        startDate: data.startDate,
        endDate: data.endDate,
        amountPaid: data.amountPaid,
        billRepId: data.billRepId || undefined,
        trainerStaffId: data.trainerStaffId || undefined,
        accountId: data.accountId || undefined,
        notes: data.notes?.trim() || undefined,
        createIncome: !!data.accountId,
      };
      if (isRenew && renewing) {
        await api.post(`/subscriptions/${renewing.id}/renew`, payload);
      } else {
        await api.post('/subscriptions', payload);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const activeStaff = staff.filter((s) => s.isActive);

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">
          {isRenew ? 'Renew Subscription' : kind === 'MEMBERSHIP' ? 'Add Subscription' : 'Assign Personal Training'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              {isRenew ? (
                <Input value={renewing?.party?.name || 'Client'} disabled />
              ) : (
                <Controller
                  name="partyId"
                  control={control}
                  render={({ field }) => (
                    <PartySelectField
                      value={field.value}
                      onChange={field.onChange}
                      parties={parties}
                      onPartyAdded={onPartyAdded}
                      defaultType="CUSTOMER"
                      error={errors.partyId?.message}
                    />
                  )}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Membership Plan</Label>
              <Controller
                name="planId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isRenew}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} · {formatCurrency(plan.priceInclGst)} incl. GST
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.planId && <p className="text-xs text-destructive">{errors.planId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
            {selectedPlan && (
              <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p>Ex GST: {formatCurrency(selectedPlan.priceExGst)} · GST ({selectedPlan.gstRate}%): {formatCurrency(selectedPlan.gstAmount)}</p>
                <p className="font-medium">Selling price (incl. GST): {formatCurrency(selectedPlan.priceInclGst)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount Paid (incl. GST)</Label>
              <Input type="number" step="0.01" {...register('amountPaid')} />
              {errors.amountPaid && <p className="text-xs text-destructive">{errors.amountPaid.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Bill Rep</Label>
              <Controller
                name="billRepId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Staff who billed" /></SelectTrigger>
                    <SelectContent>
                      {activeStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {kind === 'PERSONAL_TRAINING' && (
              <div className="space-y-2">
                <Label>Trainer</Label>
                <Controller
                  name="trainerStaffId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                      <SelectContent>
                        {activeStaff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.trainerStaffId && <p className="text-xs text-destructive">{errors.trainerStaffId.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Payment Account (optional)</Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <AccountSelectField
                    value={field.value}
                    onChange={field.onChange}
                    accounts={accounts}
                    onAccountAdded={onAccountAdded}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">Records income when an account is selected</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea {...register('notes')} rows={2} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isRenew ? 'Renew' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface SubscriptionManagerProps {
  kind: PlanKind;
  title: string;
  subtitle: string;
  autoOpenAdd?: boolean;
  renewId?: string | null;
}

export function SubscriptionManager({ kind, title, subtitle, autoOpenAdd, renewId }: SubscriptionManagerProps) {
  const [showForm, setShowForm] = useState(autoOpenAdd ?? false);
  const [renewing, setRenewing] = useState<Subscription | null>(null);
  const invalidate = useInvalidate();

  const { data: plans = [] } = useMembershipPlans(kind);
  const { data: parties = [] } = useParties('CUSTOMER');
  const { data: accounts = [] } = useAccounts();
  const { data: staff = [] } = useApiQuery<User[]>(queryKeys.staffList, '/staff?includeInactive=true');
  const { data: subscriptions = [], isLoading, isError, error, refetch } = useSubscriptions(kind);

  const activePlans = plans.filter((p) => p.isActive);

  useEffect(() => {
    if (!renewId || !subscriptions.length) return;
    const target = subscriptions.find((s) => s.id === renewId);
    if (target) {
      setRenewing(target);
      setShowForm(true);
    }
  }, [renewId, subscriptions]);

  const invalidateAll = () => {
    invalidate(queryKeys.subscriptions(kind));
    invalidate(queryKeys.income(''));
  };

  const handleSaved = () => {
    setShowForm(false);
    setRenewing(null);
    invalidateAll();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this subscription?')) return;
    await api.patch(`/subscriptions/${id}/cancel`, {});
    invalidateAll();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          onClick={() => {
            setRenewing(null);
            setShowForm(!showForm);
          }}
          disabled={!activePlans.length}
        >
          <Plus className="h-4 w-4" />
          {kind === 'MEMBERSHIP' ? 'Add Subscription' : 'Assign Personal Training'}
        </Button>
      </div>

      {!activePlans.length && (
        <p className="text-sm text-muted-foreground mb-4">
          Add a {PLAN_KIND_LABELS[kind].toLowerCase()} plan under Entry Fields → Membership Plans first.
        </p>
      )}

      {(showForm || renewing) && (
        <div className="mb-6">
          <SubscriptionForm
            key={renewing?.id ?? 'new'}
            kind={kind}
            plans={activePlans}
            parties={parties}
            accounts={accounts}
            staff={staff}
            renewing={renewing}
            onCancel={() => { setShowForm(false); setRenewing(null); }}
            onSaved={handleSaved}
            onPartyAdded={() => invalidate(queryKeys.parties('CUSTOMER'))}
            onAccountAdded={() => invalidate(queryKeys.accounts())}
          />
        </div>
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error} hasData={!!subscriptions} onRetry={() => refetch()}>
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{sub.party?.name || 'Client'}</span>
                    <Badge variant={STATUS_VARIANT[sub.status]}>{sub.status}</Badge>
                  </div>
                  <p className="text-sm">{sub.planName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                  </p>
                  <p className="text-sm">
                    {formatCurrency(sub.priceExGst)} ex GST · {formatCurrency(sub.priceInclGst)} incl. GST
                    {sub.billRep ? ` · Bill Rep: ${sub.billRep.name}` : ''}
                    {sub.trainer ? ` · Trainer: ${sub.trainer.name}` : ''}
                  </p>
                  {sub.receiptNumber && (
                    <p className="text-xs text-muted-foreground">Receipt: {sub.receiptNumber}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {sub.status !== 'CANCELLED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowForm(false); setRenewing(sub); }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {kind === 'MEMBERSHIP' ? 'Renew' : 'Renew PT'}
                    </Button>
                  )}
                  {sub.status === 'ACTIVE' && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCancel(sub.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!subscriptions.length && (
            <div className="p-8 text-center text-muted-foreground">
              {kind === 'MEMBERSHIP' ? 'No subscriptions yet.' : 'No personal training assignments yet.'}
            </div>
          )}
        </div>
      </QueryState>
    </div>
  );
}
