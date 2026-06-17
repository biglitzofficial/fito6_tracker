'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const chartColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  danger: '#ef4444',
  muted: '#a1a1aa',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('profit') || entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('expense') || entry.name.toLowerCase().includes('income')
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

interface ChartProps {
  data: { month: string; value?: number; income?: number; expense?: number }[];
  title: string;
  type?: 'line' | 'area' | 'bar' | 'cashflow';
}

export function DashboardChart({ data, title, type = 'line' }: ChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    month: d.month.slice(5) || d.month,
  }));

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          {type === 'area' ? (
            <AreaChart data={formatted}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke={chartColors.muted} fontSize={12} />
              <YAxis stroke={chartColors.muted} fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Amount" stroke={chartColors.primary} fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke={chartColors.muted} fontSize={12} />
              <YAxis stroke={chartColors.muted} fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Amount" fill={chartColors.secondary} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : type === 'cashflow' ? (
            <BarChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke={chartColors.muted} fontSize={12} />
              <YAxis stroke={chartColors.muted} fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill={chartColors.success} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={chartColors.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke={chartColors.muted} fontSize={12} />
              <YAxis stroke={chartColors.muted} fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Amount" stroke={chartColors.primary} strokeWidth={2} dot={{ fill: chartColors.primary, r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
