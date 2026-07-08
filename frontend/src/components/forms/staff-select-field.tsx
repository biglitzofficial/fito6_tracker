'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/types';

export type StaffJobType = 'SALES' | 'TRAINER' | 'BOTH' | 'GENERAL';

export const STAFF_JOB_LABELS: Record<StaffJobType, string> = {
  SALES: 'Sales Staff',
  TRAINER: 'Trainer',
  BOTH: 'Sales & Trainer',
  GENERAL: 'General Staff',
};

interface StaffSelectFieldProps {
  value?: string;
  onChange: (userId: string) => void;
  staff: User[];
  error?: string;
  placeholder?: string;
}

export function StaffSelectField({
  value,
  onChange,
  staff,
  error,
  placeholder = 'Select staff or trainer',
}: StaffSelectFieldProps) {
  const activeStaff = staff.filter((m) => m.isActive);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {activeStaff.map((member) => {
            const jobType = member.staff?.jobType as StaffJobType | undefined;
            const roleLabel = jobType ? STAFF_JOB_LABELS[jobType] : STAFF_JOB_LABELS.GENERAL;
            return (
              <SelectItem key={member.id} value={member.id}>
                {member.name} · {roleLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
