import {
  PrismaClient,
  Role,
  CategoryType,
  TaskStatus,
  TaskPriority,
  NotificationType,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';

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

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.income.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.category.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const adminPassword = await hashPassword('Admin@123');
  const staffPassword = await hashPassword('Staff@123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fito6.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const staffUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@fito6.com',
        password: staffPassword,
        name: 'John Trainer',
        role: Role.STAFF,
        staff: {
          create: { phone: '+1-555-0101', salary: 3500, joiningDate: new Date('2024-01-15') },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah@fito6.com',
        password: staffPassword,
        name: 'Sarah Coach',
        role: Role.STAFF,
        staff: {
          create: { phone: '+1-555-0102', salary: 3200, joiningDate: new Date('2024-03-01') },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike@fito6.com',
        password: staffPassword,
        name: 'Mike Reception',
        role: Role.STAFF,
        staff: {
          create: { phone: '+1-555-0103', salary: 2800, joiningDate: new Date('2024-06-10') },
        },
      },
    }),
  ]);

  const incomeCats = await Promise.all(
    INCOME_CATEGORIES.map((name) =>
      prisma.category.create({ data: { name, type: CategoryType.INCOME } })
    )
  );

  const expenseCatMap: Record<string, string> = {};
  for (const group of EXPENSE_CATEGORIES) {
    const parent = await prisma.category.create({
      data: { name: group.name, type: CategoryType.EXPENSE },
    });
    expenseCatMap[group.name] = parent.id;
    if (group.children) {
      for (const child of group.children) {
        const cat = await prisma.category.create({
          data: { name: child, type: CategoryType.EXPENSE, parentId: parent.id },
        });
        expenseCatMap[child] = cat.id;
      }
    }
  }

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const baseRevenue = 15000 + Math.random() * 10000;
    const baseExpense = 8000 + Math.random() * 5000;

    await prisma.income.createMany({
      data: [
        { amount: baseRevenue * 0.5, categoryId: incomeCats[0].id, source: 'Monthly Members', date: monthDate, createdById: admin.id },
        { amount: baseRevenue * 0.25, categoryId: incomeCats[1].id, source: 'PT Sessions', date: monthDate, createdById: staffUsers[0].id },
        { amount: baseRevenue * 0.15, categoryId: incomeCats[2].id, source: 'Protein Sales', date: monthDate, createdById: staffUsers[1].id },
        { amount: baseRevenue * 0.1, categoryId: incomeCats[5].id, source: 'Summer Event', date: monthDate, createdById: admin.id },
      ],
    });

    await prisma.expense.createMany({
      data: [
        { amount: baseExpense * 0.4, categoryId: expenseCatMap['Salary'], vendor: 'Payroll', date: monthDate, createdById: admin.id, isRecurring: true, recurringDay: 1 },
        { amount: baseExpense * 0.25, categoryId: expenseCatMap['Rent'], vendor: 'Landlord', date: monthDate, createdById: admin.id, isRecurring: true, recurringDay: 5 },
        { amount: baseExpense * 0.15, categoryId: expenseCatMap['Electricity'], vendor: 'Power Co', date: monthDate, createdById: admin.id },
        { amount: baseExpense * 0.1, categoryId: expenseCatMap['Ads'], vendor: 'Meta Ads', date: monthDate, createdById: admin.id },
        { amount: baseExpense * 0.1, categoryId: expenseCatMap['Maintenance'], vendor: 'Equip Fix', date: monthDate, createdById: staffUsers[2].id },
      ],
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const user of staffUsers) {
    const checkIn = new Date(today);
    checkIn.setHours(8, Math.floor(Math.random() * 30), 0);
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: today,
        checkIn,
        isLate: checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30),
      },
    });
  }

  await prisma.task.createMany({
    data: [
      { title: 'Restock protein supplements', description: 'Order 50 units', status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueDate: new Date(Date.now() + 86400000 * 3), assignedToId: staffUsers[1].id, createdById: admin.id },
      { title: 'Update membership plans board', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, dueDate: new Date(Date.now() + 86400000 * 7), assignedToId: staffUsers[2].id, createdById: admin.id },
      { title: 'Prepare monthly PT schedule', status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueDate: new Date(Date.now() + 86400000 * 5), assignedToId: staffUsers[0].id, createdById: admin.id },
      { title: 'Clean locker rooms', status: TaskStatus.COMPLETED, priority: TaskPriority.LOW, assignedToId: staffUsers[2].id, createdById: admin.id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: NotificationType.SALARY_DUE, title: 'Salary Due', message: 'Staff salaries are due in 3 days.', isRead: false },
      { userId: admin.id, type: NotificationType.PENDING_TASK, title: 'Pending Tasks', message: '2 tasks are still pending.', isRead: false },
      { userId: staffUsers[0].id, type: NotificationType.GENERAL, title: 'New Task Assigned', message: 'You have been assigned: Prepare monthly PT schedule', isRead: false },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: 'business_name', value: { name: 'Fito6 Gym & Fitness' } },
      { key: 'currency', value: { code: 'USD', symbol: '$' } },
      { key: 'late_threshold', value: { hour: 9, minute: 30 } },
      { key: 'fiscal_year_start', value: { month: 1 } },
    ],
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_DATABASE',
      entity: 'System',
      details: { message: 'Database seeded successfully' },
    },
  });

  console.log('✅ Seed complete!');
  console.log('   Admin: admin@fito6.com / Admin@123');
  console.log('   Staff: john@fito6.com / Staff@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
