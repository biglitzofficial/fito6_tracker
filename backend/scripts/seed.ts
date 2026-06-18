import { CategoryType } from '../src/types/enums';
import { Category } from '../src/types/models';
import { COL, create, findMany } from '../src/lib/firestore';
import { settingsService } from '../src/services/audit.service';

const INCOME_CATEGORIES = [
  'Membership Fees',
  'Personal Training',
  'Product Sales',
  'Merchandise',
  'Online Coaching',
  'Events',
  'Other Income',
];

const EXPENSE_CATEGORIES: { name: string; children?: string[] }[] = [
  { name: 'Payroll', children: ['Salary', 'Bonus', 'Incentive'] },
  { name: 'Operations', children: ['Rent', 'Electricity', 'Water', 'Internet'] },
  { name: 'Marketing', children: ['Ads', 'Promotion'] },
  { name: 'Equipment', children: ['Purchase', 'Maintenance'] },
  { name: 'Other', children: ['Miscellaneous'] },
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
  for (const name of INCOME_CATEGORIES) {
    await ensureCategory(name, CategoryType.INCOME);
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

async function seedSettings() {
  for (const setting of DEFAULT_SETTINGS) {
    await settingsService.set(setting.key, setting.value);
  }
}

async function main() {
  console.log('Seeding reference data (categories and settings)...');
  await seedCategories();
  await seedSettings();
  console.log('Reference data seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
