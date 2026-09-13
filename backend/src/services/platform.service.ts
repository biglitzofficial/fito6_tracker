import { Role } from '../types/enums';
import { Business, BusinessMember, User } from '../types/models';
import { COL, create, findMany, findOne, getById, sortBy, update } from '../lib/firestore';
import { seedBusinessDefaults } from '../lib/business-seed';
import { erpStoreService } from './erp-store.service';
import { hashPassword, validatePassword } from '../utils/password';
import { AppError } from '../utils/response';

type ErpSnapshot = {
  clients?: unknown[];
  subs?: unknown[];
  invoices?: unknown[];
  cashbook?: unknown[];
  staff?: unknown[];
  staffAtt?: unknown[];
  memberAtt?: unknown[];
  leads?: unknown[];
  settings?: { gymName?: string; branch?: string };
};

type StaffSaleRow = { name: string; billed: number; collected: number; invoices: number };
type TrainerRow = { name: string; clients: number; ptSubs: number; visits: number; revenue: number };
type StaffAttRow = { name: string; present: number; absent: number; late: number; halfDay: number };

function subStatus(end?: string, status?: string) {
  if (status === 'Used' || status === 'Frozen' || status === 'Expired') return status;
  const today = new Date().toISOString().slice(0, 10);
  if (end && end >= today) return 'Active';
  return 'Expired';
}

function computeGymPerformance(erp: ErpSnapshot | null, month: string) {
  const staffSales: Record<string, StaffSaleRow> = {};
  (erp?.invoices || []).forEach((raw) => {
    const iv = raw as {
      date?: string;
      grand?: number;
      paid?: number;
      billRep?: string;
      by?: string;
    };
    if (!(iv.date || '').startsWith(month)) return;
    const key = iv.billRep || iv.by || '—';
    if (!staffSales[key]) staffSales[key] = { name: key, billed: 0, collected: 0, invoices: 0 };
    staffSales[key].billed += Number(iv.grand || 0);
    staffSales[key].collected += Number(iv.paid || 0);
    staffSales[key].invoices += 1;
  });

  const trainerStats: Record<string, TrainerRow> = {};
  const ensureTrainer = (name: string) => {
    if (!trainerStats[name]) {
      trainerStats[name] = { name, clients: 0, ptSubs: 0, visits: 0, revenue: 0 };
    }
    return trainerStats[name];
  };

  (erp?.staff || [])
    .filter((s) => {
      const row = s as { status?: string; dept?: string; jobType?: string };
      return row.status !== 'Inactive' && /train|pt/i.test(`${row.dept || ''}${row.jobType || ''}`);
    })
    .forEach((s) => ensureTrainer((s as { name: string }).name));

  (erp?.clients || []).forEach((raw) => {
    const c = raw as { status?: string; trainer?: string };
    if (c.status === 'Inactive' || !c.trainer) return;
    ensureTrainer(c.trainer).clients += 1;
  });

  (erp?.subs || []).forEach((raw) => {
    const s = raw as {
      type?: string;
      status?: string;
      end?: string;
      clientId?: string;
      trainer?: string;
      final?: number;
    };
    if (s.type !== 'PT' || subStatus(s.end, s.status) !== 'Active') return;
    const client = (erp?.clients || []).find((c) => (c as { id?: string }).id === s.clientId) as
      | { trainer?: string }
      | undefined;
    const trainer = client?.trainer || s.trainer || '';
    if (!trainer) return;
    const row = ensureTrainer(trainer);
    row.ptSubs += 1;
    row.revenue += Number(s.final || 0);
  });

  (erp?.memberAtt || []).forEach((raw) => {
    const a = raw as { date?: string; clientId?: string };
    if (!(a.date || '').startsWith(month)) return;
    const client = (erp?.clients || []).find((c) => (c as { id?: string }).id === a.clientId) as
      | { trainer?: string }
      | undefined;
    if (!client?.trainer) return;
    ensureTrainer(client.trainer).visits += 1;
  });

  const staffAttendance: Record<string, StaffAttRow> = {};
  (erp?.staffAtt || []).forEach((raw) => {
    const a = raw as { date?: string; name?: string; status?: string };
    if (!(a.date || '').startsWith(month) || !a.name) return;
    if (!staffAttendance[a.name]) {
      staffAttendance[a.name] = { name: a.name, present: 0, absent: 0, late: 0, halfDay: 0 };
    }
    const row = staffAttendance[a.name];
    if (a.status === 'Present') row.present += 1;
    else if (a.status === 'Absent') row.absent += 1;
    else if (a.status === 'Late') row.late += 1;
    else if (a.status === 'Half Day') row.halfDay += 1;
  });

  return {
    staffSales: Object.values(staffSales).sort((a, b) => b.collected - a.collected),
    trainers: Object.values(trainerStats).sort((a, b) => b.ptSubs - a.ptSubs || b.clients - a.clients),
    staffAttendance: Object.values(staffAttendance).sort((a, b) => b.present - a.present),
  };
}

function franchiseScore(stats: GymStats) {
  const net = stats.collectionMonth - stats.expenseMonth;
  const perMember = stats.members > 0 ? stats.collectionMonth / stats.members : 0;
  return Math.round(net + perMember * 10 + stats.members * 2 + stats.leads * 0.5);
}

function defaultErpData(gymName: string) {
  return {
    settings: {
      gymName,
      branch: 'Main Branch',
      branches: ['Main Branch'],
      branchCode: 'BR01',
      gstNo: '',
      gstPct: 18,
      packages: [
        { name: '1 Month', months: 1, price: 1500 },
        { name: '3 Month', months: 3, price: 4000 },
        { name: '6 Month', months: 6, price: 7000 },
        { name: '12 Month', months: 12, price: 12000 },
      ],
      ptPackages: [{ name: 'PT 1 Month', months: 1, price: 5000 }],
      groupClassPackages: [{ name: 'Group Class 1 Month', months: 1, price: 1200 }],
      dancePackages: [{ name: 'Group Class 1 Month', months: 1, price: 1200 }],
      subTypes: [
        'New Membership',
        'Renew Membership',
        'Upgrade Membership',
        'New PT',
        'Renew PT',
        'Group Class',
      ],
      expCats: ['Rent', 'Electricity', 'Salary', 'Marketing', 'Misc'],
      incCats: ['Product Sales', 'Misc Income', 'Other Income'],
      payModes: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'],
      bankPayModes: ['UPI', 'Card'],
      openingCash: 0,
      openingBank: 0,
      adminIds: { superAdmin: '', admin: '' },
    },
    users: [],
    seq: { client: 1000, invoice: 1, receipt: 1, voucher: 1, staff: 100, trainer: 0, payroll: 0, clientByYear: {}, clientByBranch: {} },
    clients: [],
    subs: [],
    invoices: [],
    cashbook: [],
    staff: [],
    staffAtt: [],
    memberAtt: [],
    payroll: [],
    audit: [],
    leads: [],
    batches: [],
    classes: [],
    todos: [],
    meterReadings: [],
    appointments: [],
  };
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function sumCash(data: ErpSnapshot, type: 'in' | 'out', month?: string) {
  return (data.cashbook || [])
    .filter((e) => {
      const row = e as { type?: string; status?: string; date?: string; amount?: number };
      if (row.status === 'Inactive') return false;
      if (row.type !== type) return false;
      if (month && !(row.date || '').startsWith(month)) return false;
      return true;
    })
    .reduce((total: number, e) => total + Number((e as { amount?: number }).amount || 0), 0);
}

function activeMembers(data: ErpSnapshot) {
  return (data.clients || []).filter((c) => {
    const client = c as { status?: string };
    return client.status !== 'Inactive';
  }).length;
}

type GymStats = {
  members: number;
  leads: number;
  invoices: number;
  collectionMonth: number;
  expenseMonth: number;
};

export const platformService = {
  async listGyms() {
    const businesses = sortBy(await findMany<Business>(COL.businesses, () => true), 'name');
    const admins = await findMany<User>(COL.users, (u) => u.role === Role.ADMIN && u.isActive);
    const members = await findMany<BusinessMember>(COL.businessMembers, (m) => m.isActive);

    return Promise.all(
      businesses.map(async (business) => {
        const member = members.find((m) => m.businessId === business.id && m.role === Role.ADMIN);
        const admin = member ? admins.find((a) => a.id === member.userId) : null;
        const erp = (await erpStoreService.get(business.id)) as ErpSnapshot | null;
        const month = monthPrefix();
        const stats: GymStats = {
          members: erp ? activeMembers(erp) : 0,
          leads: (erp?.leads || []).length,
          invoices: (erp?.invoices || []).length,
          collectionMonth: erp ? sumCash(erp, 'in', month) : 0,
          expenseMonth: erp ? sumCash(erp, 'out', month) : 0,
        };
        return {
          id: business.id,
          name: business.name,
          gymName: erp?.settings?.gymName || business.name,
          admin: admin
            ? { id: admin.id, name: admin.name, email: admin.email, isActive: admin.isActive }
            : null,
          stats,
        };
      })
    );
  },

  async updateGym(businessId: string, gymName: string, updatedById: string) {
    const trimmed = gymName.trim();
    if (trimmed.length < 2) throw new AppError(400, 'Gym name must be at least 2 characters');

    const business = await getById<Business>(COL.businesses, businessId);
    if (!business) throw new AppError(404, 'Gym not found');

    await update(COL.businesses, businessId, { name: trimmed });

    const erp = ((await erpStoreService.get(businessId)) as ErpSnapshot | null) ?? defaultErpData(trimmed);
    erp.settings = { ...(erp.settings || {}), gymName: trimmed };
    await erpStoreService.save(businessId, erp as Record<string, unknown>, updatedById);

    return { id: businessId, name: trimmed, gymName: trimmed };
  },

  async getGymById(businessId: string) {
    const gyms = await this.listGyms();
    const gym = gyms.find((g) => g.id === businessId);
    if (!gym) throw new AppError(404, 'Gym not found');
    return gym;
  },

  async createGymAdmin(data: {
    gymName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const gymName = data.gymName.trim();
    const adminName = data.adminName.trim();
    const adminEmail = data.adminEmail.toLowerCase().trim();

    if (gymName.length < 2) throw new AppError(400, 'Gym name must be at least 2 characters');
    if (!adminName) throw new AppError(400, 'Admin name is required');

    const existing = await findOne<User>(COL.users, 'email', adminEmail);
    if (existing) throw new AppError(400, 'Email already exists');

    try {
      validatePassword(data.adminPassword);
    } catch (e) {
      throw new AppError(400, e instanceof Error ? e.message : 'Invalid password');
    }

    const password = await hashPassword(data.adminPassword);
    const admin = await create<User>(COL.users, {
      name: adminName,
      email: adminEmail,
      password,
      role: Role.ADMIN,
      isActive: true,
    });

    const business = await create<Business>(COL.businesses, {
      name: gymName,
      createdById: admin.id,
    });

    await create<BusinessMember>(COL.businessMembers, {
      businessId: business.id,
      userId: admin.id,
      role: Role.ADMIN,
      isActive: true,
    });

    await seedBusinessDefaults(business.id, gymName);
    await erpStoreService.save(business.id, defaultErpData(gymName), admin.id);

    return {
      business: { id: business.id, name: business.name },
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    };
  },

  async getAnalytics() {
    const gyms = await this.listGyms();
    const month = monthPrefix();
    const totals = gyms.reduce(
      (acc, gym) => {
        acc.gyms += 1;
        acc.members += gym.stats.members;
        acc.leads += gym.stats.leads;
        acc.collectionMonth += gym.stats.collectionMonth;
        acc.expenseMonth += gym.stats.expenseMonth;
        return acc;
      },
      { gyms: 0, members: 0, leads: 0, collectionMonth: 0, expenseMonth: 0 }
    );

    const ranked = gyms
      .map((g) => ({
        ...g,
        net: g.stats.collectionMonth - g.stats.expenseMonth,
        score: franchiseScore(g.stats),
        perMember: g.stats.members > 0 ? g.stats.collectionMonth / g.stats.members : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((g, i) => ({ ...g, rank: i + 1 }));

    return {
      month,
      totals,
      profitMonth: totals.collectionMonth - totals.expenseMonth,
      gyms: ranked,
    };
  },

  async getFranchisePerformance() {
    const month = monthPrefix();
    const gyms = await this.listGyms();
    const gymRows = await Promise.all(
      gyms.map(async (gym) => {
        const erp = (await erpStoreService.get(gym.id)) as ErpSnapshot | null;
        const performance = computeGymPerformance(erp, month);
        const net = gym.stats.collectionMonth - gym.stats.expenseMonth;
        return {
          ...gym,
          net,
          score: franchiseScore(gym.stats),
          perMember: gym.stats.members > 0 ? gym.stats.collectionMonth / gym.stats.members : 0,
          performance,
        };
      })
    );

    const ranked = gymRows.sort((a, b) => b.score - a.score).map((g, i) => ({ ...g, rank: i + 1 }));

    const staffLeaderboard = ranked
      .flatMap((g) =>
        g.performance.staffSales.map((s) => ({
          gymId: g.id,
          gymName: g.gymName || g.name,
          name: s.name,
          collected: s.collected,
          billed: s.billed,
          invoices: s.invoices,
        }))
      )
      .sort((a, b) => b.collected - a.collected);

    const trainerLeaderboard = ranked
      .flatMap((g) =>
        g.performance.trainers.map((t) => ({
          gymId: g.id,
          gymName: g.gymName || g.name,
          name: t.name,
          clients: t.clients,
          ptSubs: t.ptSubs,
          visits: t.visits,
          revenue: t.revenue,
        }))
      )
      .sort((a, b) => b.revenue - a.revenue || b.ptSubs - a.ptSubs);

    const totals = ranked.reduce(
      (acc, g) => {
        acc.gyms += 1;
        acc.members += g.stats.members;
        acc.leads += g.stats.leads;
        acc.collectionMonth += g.stats.collectionMonth;
        acc.expenseMonth += g.stats.expenseMonth;
        return acc;
      },
      { gyms: 0, members: 0, leads: 0, collectionMonth: 0, expenseMonth: 0 }
    );

    return {
      month,
      totals,
      profitMonth: totals.collectionMonth - totals.expenseMonth,
      gyms: ranked,
      staffLeaderboard: staffLeaderboard.slice(0, 50),
      trainerLeaderboard: trainerLeaderboard.slice(0, 50),
    };
  },

  async getGymPerformanceDetail(businessId: string) {
    const gym = await this.getGymById(businessId);
    const month = monthPrefix();
    const erp = (await erpStoreService.get(businessId)) as ErpSnapshot | null;
    const performance = computeGymPerformance(erp, month);
    const net = gym.stats.collectionMonth - gym.stats.expenseMonth;

    const months6 = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    const trends = months6.map((m) => ({
      month: m,
      collection: erp ? sumCash(erp, 'in', m) : 0,
      expense: erp ? sumCash(erp, 'out', m) : 0,
    }));

    return {
      month,
      gym: {
        ...gym,
        net,
        score: franchiseScore(gym.stats),
        perMember: gym.stats.members > 0 ? gym.stats.collectionMonth / gym.stats.members : 0,
      },
      performance,
      trends,
    };
  },

  async listGymAdmins() {
    const admins = sortBy(
      await findMany<User>(COL.users, (u) => u.role === Role.ADMIN),
      'createdAt',
      'desc'
    );
    const members = await findMany<BusinessMember>(COL.businessMembers, (m) => m.isActive && m.role === Role.ADMIN);

    return Promise.all(
      admins.map(async (admin) => {
        const member = members.find((m) => m.userId === admin.id);
        const business = member ? await getById<Business>(COL.businesses, member.businessId) : null;
        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          isActive: admin.isActive,
          business: business ? { id: business.id, name: business.name } : null,
        };
      })
    );
  },
};
