'use client';

import { Calendar, EyeOff, Pencil, BarChart3 } from 'lucide-react';
import { FieldToggleCard } from '@/components/entry-fields/field-toggle-card';
import { cn } from '@/lib/utils';
import type { BackdatedEntriesPolicy, StaffAccessConfig } from '@/lib/staff-access';

const BACKDATED_OPTIONS: {
  value: BackdatedEntriesPolicy;
  label: string;
  description: string;
}[] = [
  { value: 'always', label: 'Always', description: 'Can add entry on any past date' },
  { value: 'never', label: 'Never', description: 'Cannot add entries on any past date' },
  {
    value: 'one_day_before',
    label: 'One day before',
    description: 'Can add entry on today and day before',
  },
];

interface StaffAccessPanelProps {
  access: StaffAccessConfig;
  onChange: (access: StaffAccessConfig) => void;
  readOnly?: boolean;
}

export function StaffAccessPanel({ access, onChange, readOnly }: StaffAccessPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Staff Access Control</h2>
        <p className="text-sm text-muted-foreground">
          Control what staff members can see and do when adding or editing entries.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-sm">Allow backdated entries</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Restrict how far back staff can pick a date on income and expense forms.
              </p>
            </div>
            <div className="space-y-2">
              {BACKDATED_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3 transition-colors',
                    access.backdatedEntries === option.value
                      ? 'border-primary/40 bg-primary/10'
                      : 'hover:bg-accent/40',
                    readOnly && 'cursor-default opacity-80'
                  )}
                >
                  <input
                    type="radio"
                    name="backdatedEntries"
                    value={option.value}
                    checked={access.backdatedEntries === option.value}
                    disabled={readOnly}
                    onChange={() =>
                      onChange({ ...access, backdatedEntries: option.value })
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <FieldToggleCard
          title="Entry edit permission"
          description="Staff can edit their own entries"
          enabled={access.allowEditOwnEntries}
          onToggle={
            readOnly
              ? undefined
              : (v) => onChange({ ...access, allowEditOwnEntries: v })
          }
          readOnly={readOnly}
        />
        <FieldToggleCard
          title="Hide net balance & reports"
          description="Staff will not see net balance and cannot access reports"
          enabled={access.hideNetBalanceAndReports}
          onToggle={
            readOnly
              ? undefined
              : (v) => onChange({ ...access, hideNetBalanceAndReports: v })
          }
          readOnly={readOnly}
        />
        <FieldToggleCard
          title="Hide entries by other members"
          description="Staff will only see entries they created"
          enabled={access.hideOtherMembersEntries}
          onToggle={
            readOnly
              ? undefined
              : (v) => onChange({ ...access, hideOtherMembersEntries: v })
          }
          readOnly={readOnly}
        />
      </div>

      <div className="rounded-xl border border-border bg-accent/20 p-4 text-xs text-muted-foreground flex gap-3">
        <div className="flex gap-2 shrink-0">
          <Pencil className="h-4 w-4" />
          <EyeOff className="h-4 w-4" />
          <BarChart3 className="h-4 w-4" />
        </div>
        <p>
          These rules apply to all staff in this business. Admins always have full access.
          Changes take effect immediately after saving.
        </p>
      </div>
    </div>
  );
}
