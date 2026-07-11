import { CategoryType, PlanKind, SubscriptionStatus } from '../types/enums';
import { Category, MembershipPlan, Party, Subscription, User } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
  getAccountMap,
  getById,
  getPartyMap,
  getUserMap,
  sortBy,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { addDays } from '../lib/gst';
import { incomeService } from './income.service';
import { AppError } from '../utils/response';

async function withRelations(businessId: string, items: Subscription[]) {
  const partyMap = await getPartyMap(items.map((i) => i.partyId));
  const accountMap = await getAccountMap(items.map((i) => i.accountId || ''));
  const userIds = items.flatMap((i) => [i.billRepId, i.trainerStaffId, i.createdById].filter(Boolean) as string[]);
  const userMap = await getUserMap(userIds);

  return items.map((item) => ({
    ...item,
    amountPaid: Number(item.amountPaid),
    priceExGst: Number(item.priceExGst),
    priceInclGst: Number(item.priceInclGst),
    gstRate: Number(item.gstRate),
    gstAmount: Number(item.gstAmount),
    party: partyMap.get(item.partyId) ?? null,
    account: item.accountId ? accountMap.get(item.accountId) ?? null : null,
    billRep: item.billRepId ? { id: item.billRepId, name: item.billRepName || userMap.get(item.billRepId)?.name || 'Unknown' } : null,
    trainer: item.trainerStaffId
      ? { id: item.trainerStaffId, name: item.trainerName || userMap.get(item.trainerStaffId)?.name || 'Unknown' }
      : null,
    createdBy: {
      id: item.createdById,
      name: userMap.get(item.createdById)?.name || 'Unknown',
    },
  }));
}

async function findIncomeCategory(businessId: string, name: string) {
  const categories = await findManyForBusiness<Category>(
    COL.categories,
    businessId,
    (c) => c.type === CategoryType.INCOME && c.isActive && !c.parentId
  );
  return categories.find((c) => c.name === name) || null;
}

async function resolveBillRep(businessId: string, billRepId?: string) {
  if (!billRepId) return { billRepId: null as string | null, billRepName: null as string | null };
  const user = await getById<User>(COL.users, billRepId);
  if (!user) throw new AppError(400, 'Invalid bill rep selected');
  return { billRepId, billRepName: user.name };
}

async function resolveTrainer(businessId: string, trainerStaffId?: string) {
  if (!trainerStaffId) return { trainerStaffId: null as string | null, trainerName: null as string | null };
  const user = await getById<User>(COL.users, trainerStaffId);
  if (!user) throw new AppError(400, 'Invalid trainer selected');
  return { trainerStaffId, trainerName: user.name };
}

function computeStatus(endDate: Date): SubscriptionStatus {
  return endDate >= new Date(new Date().toISOString().split('T')[0]) ? SubscriptionStatus.ACTIVE : SubscriptionStatus.EXPIRED;
}

export const subscriptionService = {
  async list(businessId: string, kind?: PlanKind, partyId?: string) {
    const items = await findManyForBusiness<Subscription>(
      COL.subscriptions,
      businessId,
      (s) => (!kind || s.kind === kind) && (!partyId || s.partyId === partyId)
    );
    const sorted = sortBy(items, 'startDate', 'desc');
    return withRelations(businessId, sorted);
  },

  async getById(businessId: string, id: string) {
    const item = assertBusinessAccess(
      await getById<Subscription>(COL.subscriptions, id),
      businessId,
      'Subscription'
    );
    return (await withRelations(businessId, [item]))[0];
  },

  async create(data: {
    businessId: string;
    kind: PlanKind;
    partyId: string;
    planId: string;
    startDate: string;
    endDate?: string;
    amountPaid?: number;
    billRepId?: string;
    trainerStaffId?: string;
    accountId?: string;
    notes?: string;
    createdById: string;
    createIncome?: boolean;
  }) {
    const party = assertBusinessAccess(
      await getById<Party>(COL.parties, data.partyId),
      data.businessId,
      'Party'
    );
    if (!party.isActive) throw new AppError(400, 'Invalid client selected');

    const plan = assertBusinessAccess(
      await getById<MembershipPlan>(COL.membershipPlans, data.planId),
      data.businessId,
      'Membership plan'
    );
    if (!plan.isActive) throw new AppError(400, 'Invalid plan selected');
    if (plan.kind !== data.kind) throw new AppError(400, 'Plan type does not match subscription type');

    if (data.kind === PlanKind.PERSONAL_TRAINING && !data.trainerStaffId) {
      throw new AppError(400, 'Trainer is required for personal training');
    }

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : addDays(startDate, Number(plan.durationDays) - 1);

    const billRep = await resolveBillRep(data.businessId, data.billRepId);
    const trainer = await resolveTrainer(data.businessId, data.trainerStaffId);
    const amountPaid = data.amountPaid ?? Number(plan.priceInclGst);

    let incomeId: string | null = null;
    let receiptNumber: string | null = null;

    if (data.createIncome !== false && data.accountId) {
      const categoryName = data.kind === PlanKind.MEMBERSHIP ? 'Membership Fees' : 'Personal Training';
      const category = await findIncomeCategory(data.businessId, categoryName);
      if (category) {
        const income = await incomeService.create({
          businessId: data.businessId,
          amount: amountPaid,
          categoryId: category.id,
          accountId: data.accountId,
          partyId: data.partyId,
          date: data.startDate,
          notes: `${plan.name} subscription`,
          createdById: data.createdById,
        });
        incomeId = income.id;
        receiptNumber = income.receiptNumber || null;
      }
    }

    const subscription = await create<Subscription>(COL.subscriptions, {
      businessId: data.businessId,
      kind: data.kind,
      partyId: data.partyId,
      planId: plan.id,
      planName: plan.name,
      startDate,
      endDate,
      status: computeStatus(endDate),
      priceExGst: Number(plan.priceExGst),
      priceInclGst: Number(plan.priceInclGst),
      gstRate: Number(plan.gstRate),
      gstAmount: Number(plan.gstAmount),
      amountPaid,
      billRepId: billRep.billRepId,
      billRepName: billRep.billRepName,
      trainerStaffId: trainer.trainerStaffId,
      trainerName: trainer.trainerName,
      sessionsTotal: plan.sessionsTotal ?? null,
      sessionsUsed: 0,
      accountId: data.accountId || null,
      incomeId,
      receiptNumber,
      notes: data.notes?.trim() || null,
      createdById: data.createdById,
    });

    return (await withRelations(data.businessId, [subscription]))[0];
  },

  async renew(
    businessId: string,
    id: string,
    data: {
      startDate?: string;
      endDate?: string;
      amountPaid?: number;
      billRepId?: string;
      trainerStaffId?: string;
      accountId?: string;
      notes?: string;
      createdById: string;
      createIncome?: boolean;
    }
  ) {
    const previous = assertBusinessAccess(
      await getById<Subscription>(COL.subscriptions, id),
      businessId,
      'Subscription'
    );

    if (previous.status === SubscriptionStatus.CANCELLED) {
      throw new AppError(400, 'Cannot renew a cancelled subscription');
    }

    await update<Subscription>(COL.subscriptions, id, { status: SubscriptionStatus.EXPIRED });

    const startDate =
      data.startDate ||
      new Date(Math.max(new Date(previous.endDate).getTime(), Date.now())).toISOString().split('T')[0];

    return subscriptionService.create({
      businessId,
      kind: previous.kind,
      partyId: previous.partyId,
      planId: previous.planId,
      startDate,
      endDate: data.endDate,
      amountPaid: data.amountPaid ?? Number(previous.amountPaid),
      billRepId: data.billRepId ?? previous.billRepId ?? undefined,
      trainerStaffId: data.trainerStaffId ?? previous.trainerStaffId ?? undefined,
      accountId: data.accountId ?? previous.accountId ?? undefined,
      notes: data.notes,
      createdById: data.createdById,
      createIncome: data.createIncome,
    }).then(async (created) => {
      await update<Subscription>(COL.subscriptions, created.id, { renewedFromId: id });
      return { ...created, renewedFromId: id };
    });
  },

  async cancel(businessId: string, id: string) {
    assertBusinessAccess(await getById<Subscription>(COL.subscriptions, id), businessId, 'Subscription');
    const updated = await update<Subscription>(COL.subscriptions, id, { status: SubscriptionStatus.CANCELLED });
    return (await withRelations(businessId, [updated]))[0];
  },
};
