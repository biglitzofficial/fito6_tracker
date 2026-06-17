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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Expense, Category, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const schema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  vendor: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.coerce.number().min(1).max(31).optional(),
});

function ExpenseContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], isRecurring: false },
  });

  const fetchData = async () => {
    const [expRes, catRes] = await Promise.all([
      api.get<PaginatedResponse<Expense>>(`/expenses?search=${search}`),
      api.get<Category[]>('/categories?type=EXPENSE'),
    ]);
    setItems(expRes.items);
    setCategories(catRes.filter((c) => c.parentId));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      await api.post('/expenses', data);
      reset();
      setShowForm(false);
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await api.delete(`/expenses/${id}`);
    fetchData();
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input {...register('vendor')} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
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
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Vendor</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Recurring</th>
                      {isAdmin(user) && <th className="text-right p-4 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="p-4">{formatDate(item.date)}</td>
                        <td className="p-4"><Badge variant="secondary">{item.category.name}</Badge></td>
                        <td className="p-4 text-muted-foreground">{item.vendor || '—'}</td>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return <Suspense><ExpenseContent /></Suspense>;
}
