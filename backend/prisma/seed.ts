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

async function seedCategories() {
  for (const name of INCOME_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_type_parentId: { name, type: CategoryType.INCOME, parentId: null } },
      create: { name, type: CategoryType.INCOME },
      update: {},
    });
  }

  for (const group of EXPENSE_CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { name_type_parentId: { name: group.name, type: CategoryType.EXPENSE, parentId: null } },
      create: { name: group.name, type: CategoryType.EXPENSE },
      update: {},
    });

    if (group.children) {
      for (const child of group.children) {
        await prisma.category.upsert({
          where: { name_type_parentId: { name: child, type: CategoryType.EXPENSE, parentId: parent.id } },
          create: { name: child, type: CategoryType.EXPENSE, parentId: parent.id },
          update: {},
        });
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
