import { StaffTarget, Income, Category, User } from '../types/models';
import { Role } from '../types/enums';
import {
  COL,
  create,
  findMany,
  findManyForBusiness,
  getById,
  getUserMap,
  update,
} from '../lib/firestore';
import {
  MEMBER_SUBSCRIPTION_GROUP,
  PT_SUBSCRIPTION_GROUP,
} from '../lib/income-category-groups';
import { isValidPeriodMonth } from '../utils/period';
import { AppError } from '../utils/response';

function targetDocId(businessId: string, userId: string, periodMonth: string) {
  return `${businessId}_${userId}_${periodMonth}`;
}

async function buildCategoryParentMap(businessId: string) {
  const categories = await findManyForBusiness<Category>(COL.categories, businessId);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parentNameById = new Map<string, string>();

  for (const cat of categories) {
    if (!cat.parentId) continue;
    const parent = byId.get(cat.parentId);
    if (parent) parentNameById.set(cat.id, parent.name);
  }

  return parentNameById;
}

function incomeInPeriodMonth(date: Date, periodMonth: string) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return key === periodMonth;
}

export const staffTargetService = {
  async list(businessId: string, periodMonth: string) {
    if (!isValidPeriodMonth(periodMonth)) {
      throw new AppError(400, 'periodMonth must be in YYYY-MM format');
    }

    const targets = await findManyForBusiness<StaffTarget>(
      COL.staffTargets,
      businessId,
      (t) => t.periodMonth === periodMonth
    );

    const parentNameById = await buildCategoryParentMap(businessId);
    const incomes = await findManyForBusiness<Income>(
      COL.income,
      businessId,
      (i) => !!i.creditedToId && incomeInPeriodMonth(new Date(i.date), periodMonth)
    );

    const staffUsers = await findMany<User>(
      COL.users,
      (u) => u.role === Role.STAFF && u.isActive
    );

    const userIds = [
      ...new Set([
        ...staffUsers.map((u) => u.id),
        ...targets.map((t) => t.userId),
        ...incomes.map((i) => i.creditedToId!),
      ]),
    ];
    const userMap = await getUserMap(userIds);

    const actuals = new Map<string, { salesActual: number; ptActual: number }>();
    for (const income of incomes) {
      const userId = income.creditedToId!;
      const entry = actuals.get(userId) || { salesActual: 0, ptActual: 0 };
      const amount = Number(income.amount);
      const parentName = parentNameById.get(income.categoryId);

      if (parentName === PT_SUBSCRIPTION_GROUP) {
        entry.ptActual += amount;
      } else if (parentName === MEMBER_SUBSCRIPTION_GROUP) {
        entry.salesActual += amount;
      }
      actuals.set(userId, entry);
    }

    const targetByUser = new Map(targets.map((t) => [t.userId, t]));

    return userIds.sort().map((userId) => {
      const target = targetByUser.get(userId);
      const actual = actuals.get(userId) || { salesActual: 0, ptActual: 0 };
      return {
        userId,
        name: userMap.get(userId)?.name || 'Unknown',
        periodMonth,
        salesTarget: Number(target?.salesTarget ?? 0),
        ptTarget: Number(target?.ptTarget ?? 0),
        salesActual: actual.salesActual,
        ptActual: actual.ptActual,
      };
    });
  },

  async upsert(
    businessId: string,
    userId: string,
    periodMonth: string,
    data: { salesTarget?: number; ptTarget?: number }
  ) {
    if (!isValidPeriodMonth(periodMonth)) {
      throw new AppError(400, 'periodMonth must be in YYYY-MM format');
    }

    const id = targetDocId(businessId, userId, periodMonth);
    const existing = await getById<StaffTarget>(COL.staffTargets, id);

    if (existing) {
      const updated = await update<StaffTarget>(COL.staffTargets, id, {
        salesTarget: data.salesTarget ?? existing.salesTarget,
        ptTarget: data.ptTarget ?? existing.ptTarget,
      });
      return updated;
    }

    return create<StaffTarget>(
      COL.staffTargets,
      {
        businessId,
        userId,
        periodMonth,
        salesTarget: data.salesTarget ?? 0,
        ptTarget: data.ptTarget ?? 0,
      },
      id
    );
  },
};
