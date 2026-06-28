'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, Landmark, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/components/ui/query-state';
import { ACCOUNT_TYPE_LABELS } from '@/components/forms/account-select-field';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Account, AccountType } from '@/types';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['BANK', 'CASH', 'UPI', 'CARD', 'OTHER']),
  bankName: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  openingBalance: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

function AccountForm({
  editingAccount,
  onCancel,
  onSaved,
}: {
  editingAccount?: Account | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!editingAccount;

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingAccount
      ? {
          name: editingAccount.name,
          type: editingAccount.type,
          bankName: editingAccount.bankName || '',
          lastFour: editingAccount.lastFour || '',
          openingBalance: editingAccount.openingBalance ?? 0,
        }
      : { type: 'CASH', openingBalance: 0 },
  });

  const accountType = watch('type');

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/accounts/${editingAccount.id}`, data);
      } else {
        await api.post('/accounts', data);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-base">{isEditing ? 'Edit Account' : 'New Payment Mode'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {ACCOUNT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input {...register('name')} placeholder="e.g. HDFC Current, Petty Cash" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          {accountType === 'BANK' && (
            <>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input {...register('bankName')} placeholder="e.g. HDFC Bank" />
              </div>
              <div className="space-y-2">
                <Label>Last 4 Digits</Label>
                <Input {...register('lastFour')} placeholder="1234" maxLength={4} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Opening Balance</Label>
            <Input type="number" step="0.01" {...register('openingBalance')} />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save Changes' : 'Save Account'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface PaymentModesPanelProps {
  autoOpenAdd?: boolean;
}

export function PaymentModesPanel({ autoOpenAdd }: PaymentModesPanelProps) {
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(autoOpenAdd ?? false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const invalidate = useInvalidate();

  const { data: accounts = [], isLoading, isError, error, refetch } = useApiQuery<Account[]>(
    queryKeys.accounts(),
    '/accounts'
  );

  const closeForm = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleSaved = () => {
    closeForm();
    invalidate(queryKeys.accounts());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Disable this account?')) return;
    await api.delete(`/accounts/${id}`);
    invalidate(queryKeys.accounts());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Payment Modes</h2>
          <p className="text-sm text-muted-foreground">Manage bank, cash, UPI, and card accounts.</p>
        </div>
        <Button onClick={() => { setEditingAccount(null); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4" /> Add Payment Mode
        </Button>
      </div>

      {(showForm || editingAccount) && (
        <AccountForm
          key={editingAccount?.id ?? 'new'}
          editingAccount={editingAccount}
          onCancel={closeForm}
          onSaved={handleSaved}
        />
      )}

      <QueryState isLoading={isLoading} isError={isError} error={error} hasData={!!accounts} onRetry={() => refetch()}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
                </div>
                <h3 className="font-semibold">{account.name}</h3>
                {account.bankName && <p className="text-sm text-muted-foreground mt-1">{account.bankName}</p>}
                {account.lastFour && <p className="text-xs text-muted-foreground mt-1">•••• {account.lastFour}</p>}
                <p className="text-sm mt-3">
                  Opening balance:{' '}
                  <span className="font-medium">{formatCurrency(account.openingBalance ?? 0)}</span>
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingAccount(account); }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  {isAdmin(user) && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(account.id)}>
                      Disable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!accounts.length && (
          <div className="p-8 text-center text-muted-foreground">
            No payment modes yet. Add Cash, Bank, or UPI accounts to track payments.
          </div>
        )}
      </QueryState>
    </div>
  );
}
