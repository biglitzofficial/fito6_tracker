'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  format?: 'currency' | 'number';
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, format = 'number', className }: StatCardProps) {
  const displayValue = format === 'currency' && typeof value === 'number' ? formatCurrency(value) : value;

  return (
    <div className={cn('glass rounded-2xl p-6 animate-fade-in hover:border-white/15 transition-all duration-300', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs', trend >= 0 ? 'text-success' : 'text-destructive')}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
