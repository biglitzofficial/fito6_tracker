'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Loader2, Paperclip } from 'lucide-react';
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
import { PartySelectField } from '@/components/forms/party-select-field';
import Link from 'next/link';
import { AccountSelectField } from '@/components/forms/account-select-field';
import { api } from '@/lib/api';
import { useApiQuery, useCategories, useAccounts, useParties, useInvalidate, useEntryFields } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Expense, PaginatedResponse } from '@/types';
import { currentPeriodMonth, formatCurrency, formatDate, formatPeriodMonth, suggestExpensePeriodMonth } from '@/lib/utils';
import { mergeEntryFields } from '@/lib/entry-fields';

const baseSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  accountId: z.string().optional(),
  partyId: z.string().optional(),
  date: z.string().min(1),
  time: z.string().optional(),
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Select bill-for month'),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.union([z.string(), z.number()]).optional(),
});

type ExpenseFormValues = z.infer<typeof baseSchema>;

function parseRecurringDay(value: unknown): number | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isNaN(n) ? undefined : n;
}

function isSalaryCategory(name?: string) {
  return !!name && /salary|payroll|wage|staff|maid|cleaning/i.test(name);
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ExpenseContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
  const [editingItem, setEditingItem] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [partyError, setPartyError] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const invalidate = useInvalidate();
  const { data: entryFieldsData } = useEntryFields();
  const fieldConfig = mergeEntryFields(entryFieldsData);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const schema = useMemo(
    () =>
      baseSchema.superRefine((data, ctx) => {
        if (fieldConfig.expense.paymentMode && !data.accountId) {
          ctx.addIssue({ code: 'custom', message: 'Select an account', path: ['accountId'] });
        }
        const day = parseRecurringDay(data.recurringDay);
        if (data.isRecurring) {
          if (!day || day < 1 || day > 31) {
            ctx.addIssue({ code: 'custom', message: 'Enter recurring day (1-31)', path: ['recurringDay'] });
          }
        }
      }),
    [fieldConfig]
  );

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      time: defaultTime,
      periodMonth: suggestExpensePeriodMonth(today),
      isRecurring: false,
    },
  });

  const paymentDate = watch('date');
  const categoryId = watch('categoryId');
  const isRecurring = watch('isRecurring');

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

  const openAddForm = () => {
    setEditingItem(null);
    setAttachment(null);
    setPartyError('');
    reset({
      date: today,
      time: defaultTime,
      periodMonth: suggestExpensePeriodMonth(today),
      isRecurring: false,
      recurringDay: '',
    });
    setShowForm(true);
  };

  const openEditForm = (item: Expense) => {
    setEditingItem(item);
    setAttachment(null);
    setPartyError('');
    reset({
      amount: Number(item.amount),
      categoryId: item.categoryId,
      accountId: item.accountId || undefined,
      partyId: item.partyId || undefined,
      date: item.date.slice(0, 10),
      time: toTimeInputValue(item.date),
      periodMonth: item.periodMonth || item.date.slice(0, 7),
      notes: item.notes || '',
      isRecurring: item.isRecurring,
      recurringDay: item.recurringDay ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setAttachment(null);
    setPartyError('');
    reset({
      date: today,
      time: defaultTime,
      periodMonth: suggestExpensePeriodMonth(today),
      isRecurring: false,
      recurringDay: '',
    });
  };

  const categoryName = categories.find((c) => c.id === categoryId)?.name;
  const suggestPartyType = isSalaryCategory(categoryName) ? 'STAFF' as const : 'VENDOR' as const;

  useEffect(() => {
    if (!isRecurring) setValue('recurringDay', '');
  }, [isRecurring, setValue]);

  useEffect(() => {
    if (!paymentDate) return;
    const categoryName = categories.find((c) => c.id === categoryId)?.name;
    setValue('periodMonth', suggestExpensePeriodMonth(paymentDate, categoryName));
  }, [paymentDate, categoryId, categories, setValue]);

  const onSubmit = async (data: ExpenseFormValues) => {
    const catName = categories.find((c) => c.id === data.categoryId)?.name;
    if (fieldConfig.expense.party && isSalaryCategory(catName) && !data.partyId) {
      setPartyError('Select a party for salary and staff expenses');
      return;
    }
    setPartyError('');
    const recurringDay = parseRecurringDay(data.recurringDay);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', String(data.amount));
      formData.append('categoryId', data.categoryId);
      if (fieldConfig.expense.paymentMode && data.accountId) {
        formData.append('accountId', data.accountId);
      }
      formData.append('date', `${data.date}T${data.time || '00:00'}:00`);
      formData.append('periodMonth', data.periodMonth);
      if (data.partyId) formData.append('partyId', data.partyId);
      if (data.notes) formData.append('notes', data.notes);
      if (data.isRecurring) {
        formData.append('isRecurring', 'true');
        if (recurringDay) formData.append('recurringDay', String(recurringDay));
      } else if (editingItem) {
        formData.append('isRecurring', 'false');
      }
      if (fieldConfig.expense.attachment && attachment) formData.append('attachment', attachment);

      if (editingItem) {
        await api.put(`/expenses/${editingItem.id}`, formData);
      } else {
        await api.post('/expenses', formData);
      }
      closeForm();
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
      <Header title="Expense Management" subtitle="Track expenses with auto-generated payment voucher numbers" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by voucher no., party..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => (showForm && !editingItem ? closeForm() : openAddForm())}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
          <Button variant="outline" asChild>
            <Link href="/entry-fields">Entry Fields</Link>
          </Button>
        </div>

        {showForm && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base">
                {editingItem ? 'Edit Expense Entry' : 'Add Expense Entry'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingItem?.voucherNumber && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Voucher No: <span className="font-mono font-medium text-foreground">{editingItem.voucherNumber}</span>
                </p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" {...register('time')} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 890" {...register('amount')} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>

                {fieldConfig.expense.party && (
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
                      Required for salary/staff expenses.{' '}
                      <Link href="/entry-fields?tab=parties" className="text-primary hover:underline">
                        Manage parties
                      </Link>
                    </p>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea
                    {...register('notes')}
                    placeholder="e.g. Enter details (name, bill no, item name, quantity etc.)"
                    rows={3}
                  />
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
                {fieldConfig.expense.paymentMode && (
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

                {fieldConfig.expense.attachment && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Attach Bills</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Attach an image or PDF bill (optional)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Bill For Month</Label>
                  <Input type="month" {...register('periodMonth')} />
                  {errors.periodMonth && (
                    <p className="text-xs text-destructive">{errors.periodMonth.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Used in P&L (rent/salary defaults to previous month)</p>
                </div>
                <div className="space-y-2 flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('isRecurring')} className="rounded" />
                    Recurring Expense
                  </label>
                </div>
                {isRecurring && (
                  <div className="space-y-2">
                    <Label>Recurring Day (1-31)</Label>
                    <Input type="number" min={1} max={31} {...register('recurringDay')} />
                    {errors.recurringDay && (
                      <p className="text-xs text-destructive">{errors.recurringDay.message}</p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2 flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingItem ? (
                      'Save Changes'
                    ) : (
                      'Save Expense'
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
              hasData={!!expenseRes}
              onRetry={() => refetch()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4 font-medium">Voucher No</th>
                      <th className="text-left p-4 font-medium">Payment Date</th>
                      <th className="text-left p-4 font-medium">Bill Month</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Account</th>
                      <th className="text-left p-4 font-medium">Party</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Recurring</th>
                      <th className="text-right p-4 font-medium w-[140px]"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="group border-b border-border/50 hover:bg-accent/30">
                        <td className="p-4 font-mono text-xs">{item.voucherNumber || '—'}</td>
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
