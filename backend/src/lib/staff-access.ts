import { settingsService } from '../services/audit.service';
import { AppError } from '../utils/response';

export type BackdatedEntriesPolicy = 'always' | 'never' | 'one_day_before';

export interface StaffAccessConfig {
  backdatedEntries: BackdatedEntriesPolicy;
  allowEditOwnEntries: boolean;
  hideNetBalanceAndReports: boolean;
  hideOtherMembersEntries: boolean;
}

export const DEFAULT_STAFF_ACCESS: StaffAccessConfig = {
  backdatedEntries: 'always',
  allowEditOwnEntries: true,
  hideNetBalanceAndReports: false,
  hideOtherMembersEntries: false,
};

export function mergeStaffAccess(value: unknown): StaffAccessConfig {
  const v = value as Partial<StaffAccessConfig> | null | undefined;
  const backdatedEntries =
    v?.backdatedEntries === 'never' ||
    v?.backdatedEntries === 'one_day_before' ||
    v?.backdatedEntries === 'always'
      ? v.backdatedEntries
      : DEFAULT_STAFF_ACCESS.backdatedEntries;

  return {
    backdatedEntries,
    allowEditOwnEntries: v?.allowEditOwnEntries ?? DEFAULT_STAFF_ACCESS.allowEditOwnEntries,
    hideNetBalanceAndReports:
      v?.hideNetBalanceAndReports ?? DEFAULT_STAFF_ACCESS.hideNetBalanceAndReports,
    hideOtherMembersEntries:
      v?.hideOtherMembersEntries ?? DEFAULT_STAFF_ACCESS.hideOtherMembersEntries,
  };
}

export async function getStaffAccess(businessId: string): Promise<StaffAccessConfig> {
  const value = await settingsService.get('staff_access', businessId);
  return mergeStaffAccess(value);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function assertBackdatedEntryAllowed(date: string, policy: BackdatedEntriesPolicy) {
  const entryDate = startOfDay(new Date(date));
  const today = startOfDay(new Date());

  if (policy === 'always') return;

  if (policy === 'never') {
    if (entryDate < today) {
      throw new AppError(403, 'Backdated entries are not allowed');
    }
    return;
  }

  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - 1);
  if (entryDate < earliest) {
    throw new AppError(403, 'Entries are only allowed for today and yesterday');
  }
}

export function assertStaffCanEditEntry(
  access: StaffAccessConfig,
  userId: string,
  createdById: string
) {
  if (!access.allowEditOwnEntries) {
    throw new AppError(403, 'Entry editing is not allowed for staff');
  }
  if (createdById !== userId) {
    throw new AppError(403, 'You can only edit your own entries');
  }
}

export function assertStaffCanViewEntry(
  access: StaffAccessConfig,
  userId: string,
  createdById: string
) {
  if (access.hideOtherMembersEntries && createdById !== userId) {
    throw new AppError(403, 'You cannot view entries by other members');
  }
}
