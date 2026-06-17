'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { AdminGuard } from '@/components/auth/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, { name?: string; code?: string; symbol?: string; hour?: number; minute?: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Record<string, unknown>>('/settings').then((data) => setSettings(data as any));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/business_name', { value: settings.business_name });
      await api.put('/settings/currency', { value: settings.currency });
      await api.put('/settings/late_threshold', { value: settings.late_threshold });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div>
        <Header title="Settings" subtitle="Configure business preferences" />
        <div className="p-6 max-w-2xl space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={(settings.business_name as { name?: string })?.name || ''}
                  onChange={(e) => setSettings({ ...settings, business_name: { name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Input
                  value={(settings.currency as { code?: string })?.code || 'USD'}
                  onChange={(e) => setSettings({ ...settings, currency: { code: e.target.value, symbol: '$' } })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Attendance Settings</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Late Threshold Hour</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={(settings.late_threshold as { hour?: number })?.hour ?? 9}
                  onChange={(e) => setSettings({
                    ...settings,
                    late_threshold: { ...(settings.late_threshold as object), hour: parseInt(e.target.value) },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Threshold Minute</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={(settings.late_threshold as { minute?: number })?.minute ?? 30}
                  onChange={(e) => setSettings({
                    ...settings,
                    late_threshold: { ...(settings.late_threshold as object), minute: parseInt(e.target.value) },
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
        </div>
      </div>
    </AdminGuard>
  );
}
