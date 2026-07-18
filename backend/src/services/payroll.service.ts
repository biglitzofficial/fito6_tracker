import { CategoryType, Role } from '../types/enums';
import { Account, Category, Expense, Staff, User } from '../types/models';
import {
  COL,
  create,
  findMany,
  findManyForBusiness,
  getById,
} from '../lib/firestore';
import { nextExpenseVoucherNumber } from '../lib/receipt-number';
import { isValidPeriodMonth } from '../utils/period';
import { AppError } from '../utils/response';

function payrollMarker(userId: string, periodMonth: string) {
  return `[payroll:${userId}:${periodMonth}]`;
}

async function resolveSalaryCategory(businessId: string) {
  const categories = await findManyForBusiness<Category>(
    COL.categories,
    businessId,
    (c) => c.isActive && c.type === CategoryType.EXPENSE
  );
  const existing =
    categories.find((c) => /^salary|payroll|wage/i.test(c.name)) ||
    categories.find((c) => c.name.toLowerCase().includes('salary'));
  if (existing) return existing;

  return create<Category>(COL.categories, {
    businessId,
    name: 'Salary',
    type: CategoryType.EXPENSE,
    parentId: null,
    isActive: true,
  });
}

async function resolveCashAccount(businessId: string) {
  const accounts = await findManyForBusiness<Account>(
    COL.accounts,
    businessId,
    (a) => a.isActive !== false
  );
  return accounts.find((a) => a.type === 'CASH') || accounts[0] || null;
}

export const payrollService = {
  async preview(businessId: string, periodMonth: string) {
    if (!isValidPeriodMonth(periodMonth)) {
      throw new AppError(400, 'periodMonth must be in YYYY-MM format');
    }

    const [users, staffRows, expenses] = await Promise.all([
      findMany<User>(COL.users, (u) => u.role === Role.STAFF && u.isActive),
      findMany<Staff>(COL.staff),
      findManyForBusiness<Expense>(COL.expenses, businessId, (e) => e.periodMonth === periodMonth),
    ]);

    const staffByUser = new Map(staffRows.map((s) => [s.userId, s]));
    const existingMarkers = new Set(
      expenses
        .map((e) => e.notes || '')
        .filter((n) => n.includes(`[payroll:`) && n.includes(`:${periodMonth}]`))
    );

    const rows = users
      .map((user) => {
        const staff = staffByUser.get(user.id);
        if (!staff || Number(staff.salary) <= 0) return null;
        const marker = payrollMarker(user.id, periodMonth);
        const alreadyGenerated = [...existingMarkers].some((n) => n.includes(marker));
        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          salary: Number(staff.salary),
          alreadyGenerated,
        };
      })
      .filter(Boolean) as {
      userId: string;
      name: string;
      email: string;
      salary: number;
      alreadyGenerated: boolean;
    }[];

    const pending = rows.filter((r) => !r.alreadyGenerated);
    return {
      periodMonth,
      rows,
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, r) => s + r.salary, 0),
    };
  },

  async generate(businessId: string, periodMonth: string, createdById: string, accountId?: string) {
    const preview = await this.preview(businessId, periodMonth);
    const pending = preview.rows.filter((r) => !r.alreadyGenerated);
    if (!pending.length) {
      throw new AppError(400, 'No pending payroll entries for this month');
    }

    const category = await resolveSalaryCategory(businessId);
    let account: Account | null = null;
    if (accountId) {
      const selected = await getById<Account>(COL.accounts, accountId);
      if (selected && selected.businessId === businessId) account = selected;
    }
    if (!account) account = await resolveCashAccount(businessId);
    const [year, month] = periodMonth.split('-').map(Number);
    const payDate = new Date(year, month - 1, 1);

    const created: Expense[] = [];
    for (const row of pending) {
      const voucherNumber = await nextExpenseVoucherNumber(businessId, payDate);
      const expense = await create<Expense>(COL.expenses, {
        businessId,
        voucherNumber,
        amount: row.salary,
        categoryId: category.id,
        accountId: account?.id || null,
        partyId: null,
        vendor: row.name,
        date: payDate,
        periodMonth,
        notes: `${payrollMarker(row.userId, periodMonth)} Salary for ${row.name}`,
        isRecurring: false,
        createdById,
      });
      created.push(expense);
    }

    return {
      periodMonth,
      createdCount: created.length,
      totalAmount: created.reduce((s, e) => s + Number(e.amount), 0),
      expenses: created.map((e) => ({
        id: e.id,
        voucherNumber: e.voucherNumber,
        vendor: e.vendor,
        amount: Number(e.amount),
      })),
    };
  },
};
