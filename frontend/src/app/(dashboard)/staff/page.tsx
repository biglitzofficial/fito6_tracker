'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, UserX, KeyRound } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  salary: z.coerce.number().min(0),
  joiningDate: z.string().min(1),
  password: passwordSchema,
  sendWelcomeEmail: z.boolean().optional(),
});

function StaffContent() {
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
  const [submitting, setSubmitting] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const invalidate = useInvalidate();

  const { data: staff = [], isLoading } = useApiQuery<User[]>(
    queryKeys.staffList,
    '/staff?includeInactive=true'
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      joiningDate: new Date().toISOString().split('T')[0],
      salary: 0,
      sendWelcomeEmail: true,
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      await api.post('/staff', data);
      reset();
      setShowForm(false);
      invalidate(queryKeys.staffList);
    } finally {
      setSubmitting(false);
    }
  };

  const disableStaff = async (id: string) => {
    await api.patch(`/staff/${id}/disable`);
    invalidate(queryKeys.staffList);
  };

  const resetStaffPassword = async (id: string) => {
    setResetError('');
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setResetError(parsed.error.errors[0]?.message || 'Invalid password');
      return;
    }
    await api.patch(`/staff/${id}/password`, { password: newPassword });
    setResettingId(null);
    setNewPassword('');
  };

  return (
    <div>
      <Header title="Staff Management" subtitle="Create staff accounts and set their login passwords" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Add Staff</Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">New Staff Member</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
                <div className="space-y-2"><Label>Salary</Label><Input type="number" {...register('salary')} /></div>
                <div className="space-y-2"><Label>Joining Date</Label><Input type="date" {...register('joiningDate')} /></div>
                <div className="space-y-2">
                  <Label>Login Password</Label>
                  <Input type="password" autoComplete="new-password" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  <p className="text-xs text-muted-foreground">8+ chars with uppercase, lowercase, and a number</p>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="sendWelcomeEmail" {...register('sendWelcomeEmail')} className="rounded" />
                  <Label htmlFor="sendWelcomeEmail" className="font-normal">Email login details to staff (requires SMTP)</Label>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Staff'}</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && !staff.length ? (
            [...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)
          ) : staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <Badge variant={member.isActive ? 'success' : 'destructive'}>
                    {member.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                {member.staff && (
                  <div className="mt-4 space-y-1 text-sm">
                    <p>Salary: {formatCurrency(Number(member.staff.salary))}</p>
                    <p className="text-muted-foreground">Joined: {formatDate(member.staff.joiningDate)}</p>
                    {member.staff.phone && <p className="text-muted-foreground">{member.staff.phone}</p>}
                  </div>
                )}
                {member.isActive && (
                  <div className="mt-4 flex flex-col gap-2">
                    {resettingId === member.id ? (
                      <div className="space-y-2">
                        <Input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        {resetError && <p className="text-xs text-destructive">{resetError}</p>}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => resetStaffPassword(member.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setResettingId(null); setNewPassword(''); setResetError(''); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setResettingId(member.id)}>
                        <KeyRound className="h-4 w-4" /> Set Password
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => disableStaff(member.id)}>
                      <UserX className="h-4 w-4" /> Disable
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  return (
    <AdminGuard>
      <Suspense><StaffContent /></Suspense>
    </AdminGuard>
  );
}
