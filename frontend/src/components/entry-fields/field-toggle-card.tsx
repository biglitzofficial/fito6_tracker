'use client';

import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface FieldToggleCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle?: (enabled: boolean) => void;
  onManage?: () => void;
  readOnly?: boolean;
}

export function FieldToggleCard({
  title,
  description,
  enabled,
  onToggle,
  onManage,
  readOnly,
}: FieldToggleCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors',
        onManage && 'cursor-pointer hover:bg-accent/40'
      )}
      onClick={onManage}
      role={onManage ? 'button' : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        {!readOnly && onToggle && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{enabled ? 'ON' : 'OFF'}</span>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
        )}
        {readOnly && (
          <span className="text-xs font-medium text-muted-foreground">{enabled ? 'ON' : 'OFF'}</span>
        )}
        {onManage && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
