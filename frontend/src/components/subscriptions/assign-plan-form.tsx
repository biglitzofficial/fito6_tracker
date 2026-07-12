'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AccountSelectField } from '@/components/forms/account-select-field';
import { api } from '@/lib/api';
import { addDays, toDateInput } from '@/lib/gst';
import {
  useAccounts,
  useApiQuery,
  useInvalidate,
  useMembershipPlans,
} from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import type { Party, PlanKind, Subscription, User } from '@/types';
import { formatCurrency } from '@/lib/utils';

function buildSchema(kind: PlanKind) {
  return z.object({
    planId: z.string().min(1, 'Select a plan'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    amountPaid: z.coerce.number().positive('Amount must be positive'),
    billRepId: z.string().optional(),
    trainerStaffId:
      kind === 'PERSONAL_TRAINING' ? z.string().min(1, 'Select a trainer') : z.string().optional(),
    accountId: z.string().optional(),
    notes: z.string().optional(),
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

interface AssignPlanFormProps {
  kind: PlanKind;
  party: Party;
  renewing?: Subscription | null;
  onCancel: () => void;
  onSaved: () => void;
}

export function AssignPlanForm({ kind, party, renewing, onCancel, onSaved }: AssignPlanFormProps) {
  const isRenew = !!renewing;
  const invalidate = useInvalidate();
  const { data: plans = [] } = useMembershipPlans(kind);
  const { data: accounts = [] } = useAccounts();
  const { data: staff = [] } = useApiQuery<User[]>(queryKeys.staffList, '/staff?includeInactive=true');
  const activePlans = plans.filter((p) => p.isActive);
  const activeStaff = staff.filter((s) => s.isActive);

  const schema = useMemo(() => buildSchema(kind), [kind]);
  const today = toDateInput(new Date());
  const defaultStart = renewing
    ? toDateInput(addDays(new Date(Math.max(new Date(renewing.endDate).getTime(), Date.now())), 1))
    : today;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: renewing
      ? {
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
  const selectedPlan = activePlans.find((p) => p.id === planId) || plans.find((p) => p.id === planId);

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
        partyId: party.id,
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
      invalidate(queryKeys.subscriptions(kind));
      invalidate(queryKeys.subscriptions(kind, party.id));
      invalidate(queryKeys.income(''));
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    kind === 'MEMBERSHIP'
      ? isRenew
        ? 'Renew Membership'
        : 'Assign Membership Plan'
      : isRenew
        ? 'Renew Personal Training'
        : 'Assign Personal Training';

  if (!activePlans.length && !isRenew) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        No active {kind === 'MEMBERSHIP' ? 'membership' : 'PT'} plans found. Add one under Entry Fields →
        Membership Plans first.
        <div className="mt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Client: <span className="text-foreground font-medium">{party.name}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>{kind === 'MEMBERSHIP' ? 'Membership Plan' : 'PT Plan'}</Label>
          <Controller
            name="planId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isRenew}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {(isRenew ? plans : activePlans).map((plan) => (
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
            <p>
              Ex GST: {formatCurrency(selectedPlan.priceExGst)} · GST ({selectedPlan.gstRate}%):{' '}
              {formatCurrency(selectedPlan.gstAmount)}
            </p>
            <p className="font-medium">
              Selling price (incl. GST): {formatCurrency(selectedPlan.priceInclGst)}
            </p>
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
                <SelectTrigger>
                  <SelectValue placeholder="Staff who billed" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.trainerStaffId && (
              <p className="text-xs text-destructive">{errors.trainerStaffId.message}</p>
            )}
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
                onAccountAdded={() => invalidate(queryKeys.accounts())}
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
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRenew ? (
            'Renew'
          ) : (
            'Assign Plan'
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
