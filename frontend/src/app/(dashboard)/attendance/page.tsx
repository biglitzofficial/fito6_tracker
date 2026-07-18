'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Clock, AlertTriangle, Search, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useParties } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { formatDateTime } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  isLate: boolean;
  user?: { name: string; email: string };
}

interface MemberAttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut?: string | null;
  party?: { id: string; name: string; phone?: string | null };
}

type Tab = 'staff' | 'members';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const admin = isAdmin(user);
  const [tab, setTab] = useState<Tab>('staff');
  const [actionLoading, setActionLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.attendance(admin),
    queryFn: async () => {
      const [todayRes, historyRes] = await Promise.all([
        api.get<AttendanceRecord | null>('/attendance/today'),
        admin
          ? api.get<AttendanceRecord[]>('/attendance/report')
          : api.get<AttendanceRecord[]>('/attendance/history'),
      ]);
      return { today: todayRes, history: historyRes };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: memberToday = [], refetch: refetchMembers } = useQuery({
    queryKey: ['member-attendance', 'today'],
    queryFn: () => api.get<MemberAttendanceRecord[]>('/member-attendance/today'),
    enabled: !!user && tab === 'members',
    staleTime: 15_000,
  });

  const { data: customers = [] } = useParties('CUSTOMER');

  const today = data?.today ?? null;
  const history = data?.history ?? [];

  const memberStatusByParty = useMemo(() => {
    const map = new Map<string, MemberAttendanceRecord>();
    for (const row of memberToday) {
      if (row.party?.id) map.set(row.party.id, row);
    }
    return map;
  }, [memberToday]);

  const filteredCustomers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 40);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [customers, memberSearch]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.attendance(admin) });

  const checkIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in');
      refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const checkOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-out');
      refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const memberCheckIn = async (partyId: string) => {
    setMemberActionId(partyId);
    try {
      await api.post('/member-attendance/check-in', { partyId });
      await refetchMembers();
    } finally {
      setMemberActionId(null);
    }
  };

  const memberCheckOut = async (partyId: string) => {
    setMemberActionId(partyId);
    try {
      await api.post('/member-attendance/check-out', { partyId });
      await refetchMembers();
    } finally {
      setMemberActionId(null);
    }
  };

  return (
    <div>
      <Header
        title="Attendance"
        subtitle={admin ? 'Staff attendance + member check-in' : 'Mark your daily attendance'}
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={tab === 'staff' ? 'default' : 'outline'}
            onClick={() => setTab('staff')}
          >
            Staff
          </Button>
          <Button
            size="sm"
            variant={tab === 'members' ? 'default' : 'outline'}
            onClick={() => setTab('members')}
          >
            <UserRound className="h-4 w-4" /> Member Check-in
          </Button>
        </div>

        {tab === 'staff' && (
          <>
            {!admin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Today&apos;s Status</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                  {today?.checkIn ? (
                    <div className="space-y-2">
                      <p className="text-sm">Checked in: {formatDateTime(today.checkIn)}</p>
                      {today.isLate && (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Late Entry
                        </Badge>
                      )}
                      {today.checkOut && (
                        <p className="text-sm">Checked out: {formatDateTime(today.checkOut)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Not checked in yet</p>
                  )}
                  <div className="flex gap-3 ml-auto">
                    {!today?.checkIn && (
                      <Button onClick={checkIn} disabled={actionLoading}>
                        <LogIn className="h-4 w-4" /> Check In
                      </Button>
                    )}
                    {today?.checkIn && !today?.checkOut && (
                      <Button onClick={checkOut} disabled={actionLoading} variant="secondary">
                        <LogOut className="h-4 w-4" /> Check Out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {admin ? 'Monthly Attendance Report' : 'Attendance History'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading && !data ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          {admin && <th className="text-left p-4 font-medium">Staff</th>}
                          <th className="text-left p-4 font-medium">Date</th>
                          <th className="text-left p-4 font-medium">Check In</th>
                          <th className="text-left p-4 font-medium">Check Out</th>
                          <th className="text-left p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((record) => (
                          <tr key={record.id} className="border-b border-border/50">
                            {admin && <td className="p-4">{record.user?.name}</td>}
                            <td className="p-4">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="p-4">
                              {record.checkIn ? formatDateTime(record.checkIn) : '—'}
                            </td>
                            <td className="p-4">
                              {record.checkOut ? formatDateTime(record.checkOut) : '—'}
                            </td>
                            <td className="p-4">
                              {record.isLate ? (
                                <Badge variant="warning">Late</Badge>
                              ) : record.checkIn ? (
                                <Badge variant="success">Present</Badge>
                              ) : (
                                <Badge variant="secondary">Absent</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!history.length && (
                      <div className="p-8 text-center text-muted-foreground">
                        No attendance records
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === 'members' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check in a member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search by name or mobile..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-3">Client</th>
                        <th className="text-left p-3">Mobile</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => {
                        const record = memberStatusByParty.get(c.id);
                        const checkedIn = !!record?.checkIn && !record?.checkOut;
                        const done = !!record?.checkIn && !!record?.checkOut;
                        return (
                          <tr key={c.id} className="border-b border-border/50">
                            <td className="p-3 font-medium">{c.name}</td>
                            <td className="p-3 text-muted-foreground">{c.phone || '—'}</td>
                            <td className="p-3 text-right">
                              {done ? (
                                <Badge variant="success">Done</Badge>
                              ) : checkedIn ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={memberActionId === c.id}
                                  onClick={() => memberCheckOut(c.id)}
                                >
                                  <LogOut className="h-3.5 w-3.5" /> Check Out
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={memberActionId === c.id}
                                  onClick={() => memberCheckIn(c.id)}
                                >
                                  <LogIn className="h-3.5 w-3.5" /> Check In
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!filteredCustomers.length && (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      No matching clients
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Checked in today ({memberToday.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-4">Member</th>
                      <th className="text-left p-4">Mobile</th>
                      <th className="text-left p-4">Check In</th>
                      <th className="text-left p-4">Check Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberToday.map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="p-4 font-medium">{row.party?.name}</td>
                        <td className="p-4 text-muted-foreground">{row.party?.phone || '—'}</td>
                        <td className="p-4">{formatDateTime(row.checkIn)}</td>
                        <td className="p-4">
                          {row.checkOut ? formatDateTime(row.checkOut) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!memberToday.length && (
                  <div className="p-8 text-center text-muted-foreground">
                    No member check-ins yet today
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
