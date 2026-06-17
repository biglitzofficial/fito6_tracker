'use client';

import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore, isAdmin } from '@/stores/auth.store';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('CSV');
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; filename: string; mimeType: string; contentBase64: string; previewText?: string } | null>(null);

  const generate = async (type: string) => {
    setLoading(type);
    try {
      const endpoint = isAdmin(user) ? `/reports/${type}` : null;
      if (!endpoint) return;
      const data = await api.post<{ report: { title: string }; filename: string; mimeType: string; contentBase64: string; previewText?: string }>(endpoint, { dateFrom, dateTo, format });
      setResult({ title: data.report.title, filename: data.filename, mimeType: data.mimeType, contentBase64: data.contentBase64, previewText: data.previewText });
    } finally {
      setLoading(null);
    }
  };

  const download = () => {
    if (!result) return;
    const bytes = Uint8Array.from(atob(result.contentBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || `${result.title.replace(/\s/g, '_')}`;
    a.click();
  };

  const reports = isAdmin(user)
    ? [
        { id: 'income', label: 'Income Report', desc: 'All income entries for date range' },
        { id: 'expense', label: 'Expense Report', desc: 'All expense entries for date range' },
        { id: 'profit-loss', label: 'Profit & Loss', desc: 'P&L summary for period' },
        { id: 'attendance', label: 'Attendance Report', desc: 'Staff attendance for month' },
      ]
    : [{ id: 'income', label: 'My Income Report', desc: 'Your income entries' }];

  const content = (
    <div>
      <Header title="Reports" subtitle={isAdmin(user) ? 'Generate and export business reports' : 'View your report history'} />
      <div className="p-6 space-y-6">
        {isAdmin(user) && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
                <div className="space-y-2"><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="EXCEL">Excel</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-primary/10 p-3"><FileText className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h3 className="font-semibold">{report.label}</h3>
                        <p className="text-sm text-muted-foreground">{report.desc}</p>
                      </div>
                    </div>
                    <Button onClick={() => generate(report.id)} disabled={loading === report.id}>
                      {loading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!isAdmin(user) && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Staff members have read-only access to reports. Contact your admin to generate new reports.
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{result.title}</CardTitle>
              <Button variant="outline" onClick={download}><Download className="h-4 w-4" /> Download</Button>
            </CardHeader>
            <CardContent>
              {result.previewText ? (
                <pre className="text-xs bg-secondary rounded-xl p-4 overflow-auto max-h-64 scrollbar-thin">{result.previewText}</pre>
              ) : (
                <div className="text-sm text-muted-foreground">Preview not available for this format. Use Download.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return isAdmin(user) ? <AdminGuard>{content}</AdminGuard> : content;
}
