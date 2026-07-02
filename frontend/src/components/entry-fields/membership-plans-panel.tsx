'use client';

import { useState, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QueryState } from '@/components/ui/query-state';
import { api } from '@/lib/api';
import { calcGstFromExGst } from '@/lib/gst';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { MembershipPlan, PlanKind } from '@/types';
import { formatCurrency } from '@/lib/utils';

const PLAN_KIND_LABELS: Record<PlanKind, string> = {
  MEMBERSHIP: 'Membership',
  PERSONAL_TRAINING: 'Personal Training',
};

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  kind: z.enum(['MEMBERSHIP', 'PERSONAL_TRAINING']),
  description: z.string().optional(),
  durationDays: z.coerce.number().int().positive('Duration must be at least 1 day'),
  sessionsTotal: z.coerce.number().int().positive().optional(),
  priceExGst: z.coerce.number().positive('Price must be positive'),
  gstRate: z.coerce.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

function PlanForm({
  editingPlan,
  onCancel,
  onSaved,
}: {
  editingPlan?: MembershipPlan | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!editingPlan;

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingPlan
      ? {
          name: editingPlan.name,
          kind: editingPlan.kind,
          description: editingPlan.description || '',
          durationDays: editingPlan.durationDays,
          sessionsTotal: editingPlan.sessionsTotal ?? undefined,
          priceExGst: editingPlan.priceExGst,
          gstRate: editingPlan.gstRate,
        }
      : { kind: 'MEMBERSHIP', durationDays: 30, gstRate: 18 },
  });

  const priceExGst = watch('priceExGst') || 0;
  const gstRate = watch('gstRate') || 0;
  const kind = watch('kind');
  const preview = useMemo(() => calcGstFromExGst(Number(priceExGst) || 0, Number(gstRate) || 0), [priceExGst, gstRate]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        description: data.description?.trim() || undefined,
        sessionsTotal: data.kind === 'PERSONAL_TRAINING' ? data.sessionsTotal : undefined,
      };
      if (isEditing) {
        await api.put(`/membership-plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/membership-plans', payload);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{isEditing ? 'Edit Plan' : 'New Membership Plan'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Controller
                name="kind"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLAN_KIND_LABELS) as PlanKind[]).map((k) => (
                        <SelectItem key={k} value={k}>{PLAN_KIND_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input {...register('name')} placeholder="e.g. 3 Month Gold" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Plan Details</Label>
              <Textarea {...register('description')} placeholder="What's included in this plan?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" {...register('durationDays')} />
            </div>
            {kind === 'PERSONAL_TRAINING' && (
              <div className="space-y-2">
                <Label>Total Sessions</Label>
                <Input type="number" {...register('sessionsTotal')} placeholder="e.g. 12" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Price (excl. GST)</Label>
              <Input type="number" step="0.01" {...register('priceExGst')} />
              {errors.priceExGst && <p className="text-xs text-destructive">{errors.priceExGst.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>GST Rate (%)</Label>
              <Input type="number" step="0.01" {...register('gstRate')} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p>GST: {formatCurrency(preview.gstAmount)}</p>
            <p className="font-medium">Selling price (incl. GST): {formatCurrency(preview.priceInclGst)}</p>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save Changes' : 'Save Plan'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface MembershipPlansPanelProps {
  autoOpenAdd?: boolean;
}

export function MembershipPlansPanel({ autoOpenAdd }: MembershipPlansPanelProps) {
  const { user } = useAuthStore();
  const [kindFilter, setKindFilter] = useState<PlanKind | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(autoOpenAdd ?? false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const invalidate = useInvalidate();

  const endpoint = kindFilter === 'ALL' ? '/membership-plans' : `/membership-plans?kind=${kindFilter}`;
  const { data: plans = [], isLoading, isError, error, refetch } = useApiQuery<MembershipPlan[]>(
    queryKeys.membershipPlans(kindFilter === 'ALL' ? undefined : kindFilter),
    endpoint
  );

  const handleSaved = () => {
    setShowForm(false);
    setEditingPlan(null);
    invalidate(queryKeys.membershipPlans());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Disable this plan?')) return;
    await api.delete(`/membership-plans/${id}`);
    invalidate(queryKeys.membershipPlans());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Membership Plans</h2>
        <p className="text-sm text-muted-foreground">
          Define membership and personal training plans with GST pricing.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as PlanKind | 'ALL')}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Plans</SelectItem>
            {(Object.keys(PLAN_KIND_LABELS) as PlanKind[]).map((k) => (
              <SelectItem key={k} value={k}>{PLAN_KIND_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingPlan(null); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4" /> Add Plan
        </Button>
      </div>

      {(showForm || editingPlan) && (
        <PlanForm key={editingPlan?.id ?? 'new'} editingPlan={editingPlan} onCancel={() => { setShowForm(false); setEditingPlan(null); }} onSaved={handleSaved} />
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error} hasData={!!plans} onRetry={() => refetch()}>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">{PLAN_KIND_LABELS[plan.kind]}</Badge>
                </div>
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                <p className="text-sm mt-3">{plan.durationDays} days{plan.sessionsTotal ? ` · ${plan.sessionsTotal} sessions` : ''}</p>
                <p className="text-sm">Ex GST: {formatCurrency(plan.priceExGst)}</p>
                <p className="text-sm font-medium">Incl. GST ({plan.gstRate}%): {formatCurrency(plan.priceInclGst)}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingPlan(plan); }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  {isAdmin(user) && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(plan.id)}>Disable</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!plans.length && <div className="p-8 text-center text-muted-foreground">No plans yet. Add a membership or PT plan.</div>}
      </QueryState>
    </div>
  );
}

export { PLAN_KIND_LABELS };
