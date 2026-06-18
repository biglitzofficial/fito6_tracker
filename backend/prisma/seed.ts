import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

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
  const existing = await prisma.category.findFirst({
    where: { name, type, parentId: parentId ?? null },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: { name, type, ...(parentId ? { parentId } : {}) },
  });
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
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value },
      update: {},
    });
  }
}

async function main() {
  console.log('Seeding reference data (categories and settings)...');
  await seedCategories();
  await seedSettings();
  console.log('Reference data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
