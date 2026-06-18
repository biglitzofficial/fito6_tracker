'use client';

import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApiQuery } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/utils';
import type { PaginatedResponse } from '@/types';

interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { name: string; email: string; role: string };
}

export default function AuditLogsPage() {
  const { data, isLoading } = useApiQuery<PaginatedResponse<AuditLog>>(
    queryKeys.auditLogs,
    '/audit-logs'
  );
  const logs = data?.items ?? [];

  return (
    <AdminGuard>
      <div>
        <Header title="Audit Logs" subtitle="Track all system actions and changes" />
        <div className="p-6">
          <Card>
            <CardContent className="p-0">
              {isLoading && !data ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-4 font-medium">Timestamp</th>
                        <th className="text-left p-4 font-medium">User</th>
                        <th className="text-left p-4 font-medium">Action</th>
                        <th className="text-left p-4 font-medium">Entity</th>
                        <th className="text-left p-4 font-medium">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="p-4 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                          <td className="p-4">{log.user?.name || 'System'}</td>
                          <td className="p-4"><Badge variant="secondary">{log.action}</Badge></td>
                          <td className="p-4 text-muted-foreground">{log.entity || '—'}</td>
                          <td className="p-4 text-muted-foreground font-mono text-xs">{log.ipAddress || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!logs.length && <div className="p-8 text-center text-muted-foreground">No audit logs</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
