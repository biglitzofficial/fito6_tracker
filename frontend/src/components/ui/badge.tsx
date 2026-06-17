import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          default: 'bg-primary/20 text-primary-foreground',
          success: 'bg-success/20 text-success',
          warning: 'bg-warning/20 text-warning',
          destructive: 'bg-destructive/20 text-destructive',
          secondary: 'bg-secondary text-muted-foreground',
        }[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
