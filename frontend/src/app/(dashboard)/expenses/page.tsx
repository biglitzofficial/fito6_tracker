'use client';

import { useEffect, useState, Suspense } from 'react';
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
import { CategorySelectField } from '@/components/forms/category-select-field';
import { CategoryManager } from '@/components/forms/category-manager';
import { PartySelectField } from '@/components/forms/party-select-field';
import { PartyManager } from '@/components/forms/party-manager';
import { AccountSelectField } from '@/components/forms/account-select-field';
import { api } from '@/lib/api';
import { useApiQuery, useCategories, useAccounts, useParties, useInvalidate } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Expense, PaginatedResponse } from '@/types';
import { currentPeriodMonth, formatCurrency, formatDate, formatPeriodMonth, suggestExpensePeriodMonth } from '@/lib/utils';

const schema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1, 'Select an account'),
  partyId: z.string().optional(),
  date: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Select bill-for month'),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.coerce.number().min(1).max(31).optional(),
});

function isSalaryCategory(name?: string) {
  return !!name && /salary|payroll|wage|staff|maid|cleaning/i.test(name);
}

function ExpenseContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
  const [submitting, setSubmitting] = useState(false);
  const [partyError, setPartyError] = useState('');
  const invalidate = useInvalidate();

  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      periodMonth: suggestExpensePeriodMonth(today),
      isRecurring: false,
    },
  });

  const paymentDate = watch('date');
  const categoryId = watch('categoryId');

  const { data: allCategories = [] } = useCategories('EXPENSE');
  const parentGroups = allCategories.filter((c) => !c.parentId);
  const categories = allCategories.filter((c) => c.parentId);
  const { data: accounts = [] } = useAccounts();
  const { data: parties = [] } = useParties();
  const { data: expenseRes, isLoading, isError, error, refetch } = useApiQuery<PaginatedResponse<Expense>>(
    queryKeys.expenses(debouncedSearch),
    `/expenses?search=${debouncedSearch}`
  );
  const items = expenseRes?.items ?? [];

  const categoryName = categories.find((c) => c.id === categoryId)?.name;
  const suggestPartyType = isSalaryCategory(categoryName) ? 'STAFF' as const : 'VENDOR' as const;

  useEffect(() => {
    if (!paymentDate) return;
    const categoryName = categories.find((c) => c.id === categoryId)?.name;
    setValue('periodMonth', suggestExpensePeriodMonth(paymentDate, categoryName));
  }, [paymentDate, categoryId, categories, setValue]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const catName = categories.find((c) => c.id === data.categoryId)?.name;
    if (isSalaryCategory(catName) && !data.partyId) {
      setPartyError('Select a party for salary and staff expenses');
      return;
    }
    setPartyError('');
    setSubmitting(true);
    try {
      await api.post('/expenses', data);
      reset({
        date: today,
        periodMonth: suggestExpensePeriodMonth(today),
        isRecurring: false,
      });
      setShowForm(false);
      invalidate(queryKeys.expenses(debouncedSearch));
      invalidate(queryKeys.dashboard);
      invalidate(queryKeys.profitLoss(currentPeriodMonth()));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await api.delete(`/expenses/${id}`);
    invalidate(queryKeys.expenses(debouncedSearch));
    invalidate(queryKeys.dashboard);
  };

  return (
    <div>
      <Header title="Expense Management" subtitle="Track bills, payroll, and operational costs" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Add Expense</Button>
        </div>

        <CategoryManager
          type="EXPENSE"
          categories={allCategories}
          onUpdated={() => invalidate(queryKeys.categories('EXPENSE'))}
        />

        <PartyManager parties={parties} onUpdated={() => invalidate(queryKeys.parties())} />

        {showForm && (
          <Card className="animate-fade-in">
            <CardHeader><CardTitle className="text-base">New Expense Entry</CardTitle></CardHeader>
            <CardContent>
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
                        type="EXPENSE"
                        value={field.value}
                        onChange={field.onChange}
                        categories={categories}
                        parentGroups={parentGroups}
                        onCategoryAdded={() => invalidate(queryKeys.categories('EXPENSE'))}
                        error={errors.categoryId?.message}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paid From</Label>
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Party Name (Contact)</Label>
                  <Controller
                    name="partyId"
                    control={control}
                    render={({ field }) => (
                      <PartySelectField
                        value={field.value}
                        onChange={(id) => {
                          field.onChange(id);
                          setPartyError('');
                        }}
                        parties={parties}
                        defaultType={suggestPartyType}
                        onPartyAdded={() => invalidate(queryKeys.parties())}
                        error={partyError}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for salary/staff expenses. Select staff like KASTHURI-MAID or add a new party.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" {...register('date')} />
                  <p className="text-xs text-muted-foreground">When money left your account (used in Ledger)</p>
                </div>
                <div className="space-y-2">
                  <Label>Bill For Month</Label>
                  <Input type="month" {...register('periodMonth')} />
                  {errors.periodMonth && (
                    <p className="text-xs text-destructive">{errors.periodMonth.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Which month this expense belongs to (used in P&L). Rent/salary defaults to previous month.
                  </p>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <input type="checkbox" {...register('isRecurring')} className="rounded" />
                  <Label>Recurring Expense</Label>
                </div>
                <div className="space-y-2">
                  <Label>Recurring Day (1-31)</Label>
                  <Input type="number" min={1} max={31} {...register('recurringDay')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Expense'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
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
              hasData={!!expenseRes}
              onRetry={() => refetch()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4 font-medium">Payment Date</th>
                      <th className="text-left p-4 font-medium">Bill Month</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Account</th>
                      <th className="text-left p-4 font-medium">Party</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Recurring</th>
                      {isAdmin(user) && <th className="text-right p-4 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="p-4">{formatDate(item.date)}</td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {formatPeriodMonth(item.periodMonth || item.date.slice(0, 7))}
                          </Badge>
                        </td>
                        <td className="p-4"><Badge variant="secondary">{item.category?.name ?? 'Unknown'}</Badge></td>
                        <td className="p-4 text-muted-foreground">{item.account?.name ?? '—'}</td>
                        <td className="p-4 text-muted-foreground">
                          {item.party?.name || item.vendor || '—'}
                        </td>
                        <td className="p-4 text-right font-medium text-destructive">{formatCurrency(Number(item.amount))}</td>
                        <td className="p-4">{item.isRecurring ? <Badge variant="warning">Yes</Badge> : '—'}</td>
                        {isAdmin(user) && (
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}>Delete</Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!items.length && <div className="p-8 text-center text-muted-foreground">No expense records found</div>}
              </div>
            </QueryState>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return <Suspense><ExpenseContent /></Suspense>;
}
