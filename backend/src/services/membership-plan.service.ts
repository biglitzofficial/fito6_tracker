import { PlanKind } from '../types/enums';
import { MembershipPlan } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
  getById,
  sortBy,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { calcGstFromExGst } from '../lib/gst';
import { AppError } from '../utils/response';

export const membershipPlanService = {
  async list(businessId: string, kind?: PlanKind) {
    const plans = await findManyForBusiness<MembershipPlan>(
      COL.membershipPlans,
      businessId,
      (p) => p.isActive && (!kind || p.kind === kind)
    );
    return sortBy(plans, 'name', 'asc').map((plan) => ({
      ...plan,
      priceExGst: Number(plan.priceExGst),
      priceInclGst: Number(plan.priceInclGst),
      gstRate: Number(plan.gstRate),
      gstAmount: Number(plan.gstAmount),
      durationDays: Number(plan.durationDays),
    }));
  },

  async create(data: {
    businessId: string;
    name: string;
    kind: PlanKind;
    description?: string | null;
    durationDays: number;
    sessionsTotal?: number | null;
    priceExGst: number;
    gstRate: number;
  }) {
    const name = data.name.trim();
    const existing = (await findManyForBusiness<MembershipPlan>(COL.membershipPlans, data.businessId)).find(
      (p) => p.isActive && p.kind === data.kind && p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    const gst = calcGstFromExGst(data.priceExGst, data.gstRate);
    return create<MembershipPlan>(COL.membershipPlans, {
      businessId: data.businessId,
      name,
      kind: data.kind,
      description: data.description?.trim() || null,
      durationDays: data.durationDays,
      sessionsTotal: data.sessionsTotal ?? null,
      ...gst,
      isActive: true,
    });
  },

  async update(
    businessId: string,
    id: string,
    data: {
      name?: string;
      kind?: PlanKind;
      description?: string | null;
      durationDays?: number;
      sessionsTotal?: number | null;
      priceExGst?: number;
      gstRate?: number;
      isActive?: boolean;
    }
  ) {
    const plan = assertBusinessAccess(
      await getById<MembershipPlan>(COL.membershipPlans, id),
      businessId,
      'Membership plan'
    );

    const updateData: Partial<MembershipPlan> = { ...data };
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length < 2) throw new AppError(400, 'Plan name must be at least 2 characters');
      updateData.name = name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.priceExGst !== undefined || data.gstRate !== undefined) {
      const gst = calcGstFromExGst(
        data.priceExGst ?? Number(plan.priceExGst),
        data.gstRate ?? Number(plan.gstRate)
      );
      Object.assign(updateData, gst);
    }

    return update<MembershipPlan>(COL.membershipPlans, id, updateData);
  },

  async delete(businessId: string, id: string) {
    assertBusinessAccess(await getById<MembershipPlan>(COL.membershipPlans, id), businessId, 'Membership plan');
    return update<MembershipPlan>(COL.membershipPlans, id, { isActive: false });
  },
};
