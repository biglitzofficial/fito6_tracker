import { CategoryType, AccountType } from '../types/enums';
import { Category, Account } from '../types/models';
import { COL, create, findMany } from './firestore';
import { settingsService } from '../services/audit.service';
import { INCOME_CATEGORY_GROUPS } from './income-category-groups';

const EXPENSE_CATEGORIES: { name: string; children?: string[] }[] = [
  { name: 'Labour', children: ['Electrician and Plumber'] },
  { name: 'Purchase', children: ['Electrical and Plumbing Spare'] },
  { name: 'Office', children: ['Printing', 'Stationary'] },
  { name: 'Incentives', children: ['PT Incentive', 'Sales Incentive'] },
  { name: 'Finance', children: ['Loan EMI'] },
  { name: 'Assets', children: ['Assets Purchase'] },
  { name: 'Utilities', children: ['Phone Bills', 'Internet'] },
  { name: 'Maintenance', children: ['Machine Service'] },
];

const DEFAULT_ACCOUNTS: { name: string; type: AccountType }[] = [
  { name: 'Cash', type: AccountType.CASH },
  { name: 'Card', type: AccountType.CARD },
  { name: 'Bank', type: AccountType.BANK },
];

const DEFAULT_ENTRY_FIELDS = {
  income: { party: true, category: true, paymentMode: true, staff: true },
  expense: { party: true, category: true, paymentMode: true, attachment: true },
};

async function ensureCategory(
  businessId: string,
  name: string,
  type: CategoryType,
  parentId?: string
) {
  const existing = (await findMany<Category>(COL.categories)).find(
    (c) =>
      c.businessId === businessId &&
      c.name === name &&
      c.type === type &&
      (c.parentId || null) === (parentId || null)
  );
  if (existing) return existing;
  return create(COL.categories, { businessId, name, type, parentId, isActive: true });
}

async function ensureAccount(businessId: string, name: string, type: AccountType) {
  const existing = (await findMany<Account>(COL.accounts)).find(
    (a) => a.businessId === businessId && a.name === name && a.type === type && a.isActive
  );
  if (existing) return existing;
  return create(COL.accounts, { businessId, name, type, openingBalance: 0, isActive: true });
}

export async function seedBusinessDefaults(businessId: string, businessName: string) {
  for (const group of INCOME_CATEGORY_GROUPS) {
    const parent = await ensureCategory(businessId, group.name, CategoryType.INCOME);
    for (const child of group.children) {
      await ensureCategory(businessId, child, CategoryType.INCOME, parent.id);
    }
  }

  for (const group of EXPENSE_CATEGORIES) {
    const parent = await ensureCategory(businessId, group.name, CategoryType.EXPENSE);
    if (group.children) {
      for (const child of group.children) {
        await ensureCategory(businessId, child, CategoryType.EXPENSE, parent.id);
      }
    }
  }

  for (const account of DEFAULT_ACCOUNTS) {
    await ensureAccount(businessId, account.name, account.type);
  }

  await settingsService.set('business_name', { name: businessName }, businessId);
  await settingsService.set('currency', { code: 'INR', symbol: '₹' }, businessId);
  await settingsService.set('late_threshold', { hour: 9, minute: 30 }, businessId);
  await settingsService.set('fiscal_year_start', { month: 4 }, businessId);
  await settingsService.set('entry_fields', DEFAULT_ENTRY_FIELDS, businessId);
  await settingsService.set(
    'staff_access',
    {
      backdatedEntries: 'always',
      allowEditOwnEntries: true,
      hideNetBalanceAndReports: false,
      hideOtherMembersEntries: false,
    },
    businessId
  );
}
