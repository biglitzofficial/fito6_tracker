'use client';

import { useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/ui/query-state';
import { RowHoverActions } from '@/components/ui/row-hover-actions';
import { CategorySelectField } from '@/components/forms/category-select-field';
import { AccountSelectField } from '@/components/forms/account-select-field';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApiQuery, useCategories, useAccounts, useInvalidate, useEntryFields } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Income, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mergeEntryFields } from '@/lib/entry-fields';

const baseSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  source: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

function IncomeContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
  const [editingItem, setEditingItem] = useState<Income | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const invalidate = useInvalidate();
  const { data: entryFieldsData } = useEntryFields();
  const fieldConfig = mergeEntryFields(entryFieldsData);

  const schema = useMemo(
    () =>
      baseSchema.superRefine((data, ctx) => {
        if (!data.categoryId) {
          ctx.addIssue({ code: 'custom', message: 'Select a category', path: ['categoryId'] });
        }
        if (fieldConfig.income.paymentMode && !data.accountId) {
          ctx.addIssue({ code: 'custom', message: 'Select an account', path: ['accountId'] });
        }
      }),
    [fieldConfig]
  );

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });

  const { data: allCategories = [] } = useCategories('INCOME');
  const categories = allCategories.filter((c) => !c.parentId);
  const { data: accounts = [] } = useAccounts();
  const { data: incomeRes, isLoading, isError, error, refetch } = useApiQuery<PaginatedResponse<Income>>(
    queryKeys.income(debouncedSearch),
    `/income?search=${debouncedSearch}`
  );
  const items = incomeRes?.items ?? [];

  const openAddForm = () => {
    setEditingItem(null);
    reset({ date: new Date().toISOString().split('T')[0] });
    setShowForm(true);
  };

  const openEditForm = (item: Income) => {
    setEditingItem(item);
    reset({
      amount: Number(item.amount),
      categoryId: item.categoryId,
      accountId: item.accountId || undefined,
      source: item.source || '',
      date: item.date.slice(0, 10),
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    reset({ date: new Date().toISOString().split('T')[0] });
  };

  const onSubmit = async (data: z.infer<typeof baseSchema>) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId,
        accountId: fieldConfig.income.paymentMode ? data.accountId : undefined,
      };
      if (editingItem) {
        await api.put(`/income/${editingItem.id}`, payload);
      } else {
        await api.post('/income', payload);
      }
      closeForm();
      invalidate(queryKeys.income(debouncedSearch));
      invalidate(queryKeys.dashboard);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await api.delete(`/income/${id}`);
    invalidate(queryKeys.income(debouncedSearch));
    invalidate(queryKeys.dashboard);
  };

  return (
    <div>
      <Header title="Income Management" subtitle="Track income with auto-generated receipt voucher numbers" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by receipt no., source..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => (showForm && !editingItem ? closeForm() : openAddForm())}>
            <Plus className="h-4 w-4" /> Add Income
          </Button>
          <Button variant="outline" asChild>
            <Link href="/entry-fields">Entry Fields</Link>
          </Button>
        </div>

        {showForm && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base">
                {editingItem ? 'Edit Income Entry' : 'New Income Entry'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingItem?.receiptNumber && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Receipt No: <span className="font-mono font-medium text-foreground">{editingItem.receiptNumber}</span>
                </p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" {...register('amount')} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <CategorySelectField
                        type="INCOME"
                        value={field.value}
                        onChange={field.onChange}
                        categories={categories}
                        onCategoryAdded={() => invalidate(queryKeys.categories('INCOME'))}
                        error={errors.categoryId?.message}
                      />
                    )}
                  />
                </div>
                {fieldConfig.income.paymentMode && (
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Controller
                      name="accountId"
                      control={control}
                      render={({ field }) => (
                        <AccountSelectField
                          value={field.value}
                          onChange={field.onChange}
                          accounts={accounts}
                          onAccountAdded={() => invalidate(queryKeys.accounts())}
                          error={errors.accountId?.message}
                        />
                      )}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input {...register('source')} placeholder="e.g. Monthly members" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingItem ? (
                      'Save Changes'
                    ) : (
                      'Save Income'
                    )}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              hasData={!!incomeRes}
              onRetry={() => refetch()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4 font-medium">Receipt No</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Account</th>
                      <th className="text-left p-4 font-medium">Source</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">By</th>
                      <th className="text-right p-4 font-medium w-[140px]"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="group border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="p-4 font-mono text-xs">{item.receiptNumber || '—'}</td>
                        <td className="p-4">{formatDate(item.date)}</td>
                        <td className="p-4"><Badge variant="secondary">{item.category?.name ?? 'Unknown'}</Badge></td>
                        <td className="p-4 text-muted-foreground">{item.account?.name ?? '—'}</td>
                        <td className="p-4 text-muted-foreground">{item.source || '—'}</td>
                        <td className="p-4 text-right font-medium text-success">{formatCurrency(Number(item.amount))}</td>
                        <td className="p-4 text-muted-foreground">{item.createdBy?.name ?? 'Unknown'}</td>
                        <td className="p-4">
                          <RowHoverActions
                            onEdit={() => openEditForm(item)}
                            onDelete={isAdmin(user) ? () => handleDelete(item.id) : undefined}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!items.length && <div className="p-8 text-center text-muted-foreground">No income records found</div>}
              </div>
            </QueryState>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IncomePage() {
  return <Suspense><IncomeContent /></Suspense>;
}
