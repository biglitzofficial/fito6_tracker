'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import type { Task, User, PaginatedResponse } from '@/types';
import { formatDate } from '@/lib/utils';

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
  assignedToId: z.string().min(1),
});

export default function TasksPage() {
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const invalidate = useInvalidate();
  const admin = isAdmin(user);

  const { data: taskRes, isLoading } = useApiQuery<PaginatedResponse<Task>>(
    queryKeys.tasks,
    '/tasks',
    { enabled: !!user }
  );
  const { data: staff = [] } = useApiQuery<User[]>(
    queryKeys.staff,
    '/staff',
    { enabled: !!user && admin, staleTime: 2 * 60_000 }
  );
  const tasks = taskRes?.items ?? [];

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const onSubmit = async (data: z.infer<typeof createSchema>) => {
    await api.post('/tasks', data);
    reset();
    setShowForm(false);
    invalidate(queryKeys.tasks);
  };

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/tasks/${id}/status`, { status });
    invalidate(queryKeys.tasks);
  };

  const priorityColor = (p: string) => p === 'HIGH' ? 'destructive' : p === 'MEDIUM' ? 'warning' : 'secondary';

  const content = (
    <div>
      <Header title="Tasks" subtitle={isAdmin(user) ? 'Create and assign tasks' : 'Your assigned tasks'} />
      <div className="p-6 space-y-6">
        {isAdmin(user) && (
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Create Task</Button>
          </div>
        )}

        {showForm && isAdmin(user) && (
          <Card>
            <CardHeader><CardTitle className="text-base">New Task</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input {...register('title')} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...register('description')} /></div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Controller
                    name="assignedToId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" {...register('dueDate')} /></div>
                <div className="md:col-span-2"><Button type="submit">Create Task</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {isLoading && !taskRes ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant={priorityColor(task.priority) as 'destructive'}>{task.priority}</Badge>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {isAdmin(user) && <span>Assigned: {task.assignedTo.name}</span>}
                    {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.status === 'COMPLETED' ? 'success' : 'default'}>{task.status.replace('_', ' ')}</Badge>
                  {task.status !== 'COMPLETED' && (
                    <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!tasks.length && !isLoading && <div className="text-center text-muted-foreground py-8">No tasks found</div>}
        </div>
      </div>
    </div>
  );

  return content;
}
