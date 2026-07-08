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

export function earliestAllowedEntryDate(policy: BackdatedEntriesPolicy): string | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (policy === 'always') return undefined;

  if (policy === 'never') {
    return today.toISOString().split('T')[0];
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function staffCanEditEntry(
  access: StaffAccessConfig,
  userId: string,
  createdById: string
): boolean {
  if (!access.allowEditOwnEntries) return false;
  return createdById === userId;
}
