'use client';

import { useEffect, useState } from 'react';
import { LogIn, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
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

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    const [todayRes, historyRes] = await Promise.all([
      api.get<AttendanceRecord | null>('/attendance/today'),
      isAdmin(user) ? api.get<AttendanceRecord[]>('/attendance/report') : api.get<AttendanceRecord[]>('/attendance/history'),
    ]);
    setToday(todayRes);
    setHistory(historyRes);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const checkIn = async () => {
    setActionLoading(true);
    try { await api.post('/attendance/check-in'); fetchData(); } finally { setActionLoading(false); }
  };

  const checkOut = async () => {
    setActionLoading(true);
    try { await api.post('/attendance/check-out'); fetchData(); } finally { setActionLoading(false); }
  };

  return (
    <div>
      <Header title="Attendance" subtitle={isAdmin(user) ? 'Team attendance overview' : 'Mark your daily attendance'} />
      <div className="p-6 space-y-6">
        {!isAdmin(user) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Today&apos;s Status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              {today?.checkIn ? (
                <div className="space-y-2">
                  <p className="text-sm">Checked in: {formatDateTime(today.checkIn)}</p>
                  {today.isLate && <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" /> Late Entry</Badge>}
                  {today.checkOut && <p className="text-sm">Checked out: {formatDateTime(today.checkOut)}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Not checked in yet</p>
              )}
              <div className="flex gap-3 ml-auto">
                {!today?.checkIn && (
                  <Button onClick={checkIn} disabled={actionLoading}><LogIn className="h-4 w-4" /> Check In</Button>
                )}
                {today?.checkIn && !today?.checkOut && (
                  <Button onClick={checkOut} disabled={actionLoading} variant="secondary"><LogOut className="h-4 w-4" /> Check Out</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {isAdmin(user) ? 'Monthly Attendance Report' : 'Attendance History'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      {isAdmin(user) && <th className="text-left p-4 font-medium">Staff</th>}
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Check In</th>
                      <th className="text-left p-4 font-medium">Check Out</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-border/50">
                        {isAdmin(user) && <td className="p-4">{record.user?.name}</td>}
                        <td className="p-4">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-4">{record.checkIn ? formatDateTime(record.checkIn) : '—'}</td>
                        <td className="p-4">{record.checkOut ? formatDateTime(record.checkOut) : '—'}</td>
                        <td className="p-4">
                          {record.isLate ? <Badge variant="warning">Late</Badge> : record.checkIn ? <Badge variant="success">Present</Badge> : <Badge variant="secondary">Absent</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!history.length && <div className="p-8 text-center text-muted-foreground">No attendance records</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
