import { CategoryType, AccountType } from '../src/types/enums';
import { Category, Account } from '../src/types/models';
import { COL, create, findMany } from '../src/lib/firestore';
import { settingsService } from '../src/services/audit.service';
import { INCOME_CATEGORY_GROUPS } from '../src/lib/income-category-groups';

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

const DEFAULT_SETTINGS: { key: string; value: Record<string, unknown> }[] = [
  { key: 'business_name', value: { name: 'Fito6' } },
  { key: 'currency', value: { code: 'INR', symbol: '₹' } },
  { key: 'late_threshold', value: { hour: 9, minute: 30 } },
  { key: 'fiscal_year_start', value: { month: 4 } },
];

async function ensureCategory(name: string, type: CategoryType, parentId?: string) {
  const existing = (await findMany<Category>(COL.categories)).find(
    (c) => c.name === name && c.type === type && (c.parentId || null) === (parentId || null)
  );
  if (existing) return existing;
  return create(COL.categories, { name, type, parentId, isActive: true });
}

async function seedCategories() {
  for (const group of INCOME_CATEGORY_GROUPS) {
    const parent = await ensureCategory(group.name, CategoryType.INCOME);
    for (const child of group.children) {
      await ensureCategory(child, CategoryType.INCOME, parent.id);
    }
  }

  for (const group of EXPENSE_CATEGORIES) {
    const parent = await ensureCategory(group.name, CategoryType.EXPENSE);
    if (group.children) {
      for (const child of group.children) {
        await ensureCategory(child, CategoryType.EXPENSE, parent.id);
      }
    }
  }
}

async function ensureAccount(name: string, type: AccountType) {
  const existing = (await findMany<Account>(COL.accounts)).find(
    (a) => a.name === name && a.type === type && a.isActive
  );
  if (existing) return existing;
  return create(COL.accounts, { name, type, openingBalance: 0, isActive: true });
}

async function seedAccounts() {
  for (const account of DEFAULT_ACCOUNTS) {
    await ensureAccount(account.name, account.type);
  }
}

async function seedSettings() {
  for (const setting of DEFAULT_SETTINGS) {
    await settingsService.set(setting.key, setting.value);
  }
}

async function main() {
  console.log('Seeding reference data (categories, accounts, and settings)...');
  await seedCategories();
  await seedAccounts();
  await seedSettings();
  console.log('Reference data seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
