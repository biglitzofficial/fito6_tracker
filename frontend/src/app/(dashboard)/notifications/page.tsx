'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = () => api.get<Notification[]>('/notifications').then(setNotifications);

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const typeVariant = (type: string) => {
    if (type.includes('EXPENSE') || type.includes('CASH')) return 'warning' as const;
    if (type.includes('TASK') || type.includes('ATTENDANCE')) return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <div>
      <Header title="Notifications" subtitle="Alerts and system notifications" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark All Read</Button>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.isRead ? 'border-primary/30' : ''}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`rounded-xl p-2 ${!n.isRead ? 'bg-primary/20' : 'bg-secondary'}`}>
                  <Bell className={`h-4 w-4 ${!n.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{n.title}</h3>
                    <Badge variant={typeVariant(n.type)}>{n.type.replace(/_/g, ' ')}</Badge>
                    {!n.isRead && <Badge variant="default">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>Mark read</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!notifications.length && <div className="text-center text-muted-foreground py-8">No notifications</div>}
        </div>
      </div>
    </div>
  );
}
