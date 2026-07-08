import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

const INCOME_CATEGORIES: { name: string; children: string[] }[] = [
  {
    name: 'Member Subscription Plan',
    children: [
      'Zumba',
      'INBODY ASSESSMENT',
      'Daily Package',
      'Basic Monthly',
      'Basic Quarterly',
      'Basic Half Yearly',
      'Basic Yearly',
    ],
  },
  {
    name: 'Personal Training Subscription Plan',
    children: [
      'Personal Training - 1 Month',
      'Personal Training - 2 Months',
      'Personal Training - 3 Months',
      'Couple Personal Training - 1 Month',
      'Couple Personal Training - 2 Months',
    ],
  },
];

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
  for (const group of INCOME_CATEGORIES) {
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
