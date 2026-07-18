import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[10px] px-2.5 py-0.5 text-[11px] font-bold transition-colors',
        {
          default: 'bg-[#ffefe3] text-primary',
          success: 'bg-[#e3f6ec] text-success',
          warning: 'bg-[#fdf3dd] text-[#a97507]',
          destructive: 'bg-[#fdeaea] text-destructive',
          secondary: 'bg-[#eef1f6] text-muted-foreground',
        }[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
