import { Role } from '../types/enums';
import { Business, BusinessMember, User } from '../types/models';
import { COL, create, findMany, findOne, getById, sortBy } from '../lib/firestore';
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
  leads?: unknown[];
  settings?: { gymName?: string; branch?: string };
};

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
      openingCash: 0,
      openingBank: 0,
      adminIds: { superAdmin: '', admin: '' },
    },
    users: [],
    seq: { client: 1000, invoice: 1, receipt: 1, voucher: 1, staff: 100, trainer: 0, payroll: 0, clientByYear: {} },
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

    return {
      month,
      totals,
      profitMonth: totals.collectionMonth - totals.expenseMonth,
      gyms: gyms.sort((a, b) => b.stats.collectionMonth - a.stats.collectionMonth),
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
