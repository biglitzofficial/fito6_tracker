import { Role, StaffJobType } from '../types/enums';
import { User, Staff } from '../types/models';
import { COL, create, findMany, findOne, getById, sortBy, update } from '../lib/firestore';
import { hashPassword, validatePassword } from '../utils/password';
import { sendStaffWelcomeEmail } from '../lib/email';
import { AppError } from '../utils/response';
import { config } from '../config';
import { businessService } from './business.service';

async function withStaff(user: User & { id: string }) {
  const staff = await findOne<Staff>(COL.staff, 'userId', user.id);
  return { ...user, staff: staff ? { ...staff, salary: Number(staff.salary) } : null };
}

export const staffService = {
  async list(includeInactive = false) {
    const users = await findMany<User>(
      COL.users,
      (u) => u.role === Role.STAFF && (includeInactive || u.isActive)
    );
    const sorted = sortBy(users, 'createdAt', 'desc');
    return Promise.all(sorted.map(withStaff));
  },

  async getById(id: string) {
    const user = await getById<User>(COL.users, id);
    if (!user || user.role !== Role.STAFF) throw new AppError(404, 'Staff not found');
    return withStaff(user);
  },

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    salary: number;
    joiningDate: string;
    password: string;
    jobType?: StaffJobType;
    sendWelcomeEmail?: boolean;
    businessId?: string;
    createdByUserId?: string;
  }) {
    const existing = await findOne<User>(COL.users, 'email', data.email.toLowerCase());
    if (existing) throw new AppError(400, 'Email already exists');

    try {
      validatePassword(data.password);
    } catch (e) {
      throw new AppError(400, e instanceof Error ? e.message : 'Invalid password');
    }

    const password = await hashPassword(data.password);
    const user = await create<User>(COL.users, {
      name: data.name,
      email: data.email.toLowerCase(),
      password,
      role: Role.STAFF,
      isActive: true,
    });

    const staff = await create<Staff>(COL.staff, {
      userId: user.id,
      phone: data.phone,
      salary: data.salary,
      joiningDate: new Date(data.joiningDate),
      jobType: data.jobType || StaffJobType.GENERAL,
    });

    if (data.businessId) {
      if (data.createdByUserId) {
        const membership = await businessService.getMembership(data.createdByUserId, data.businessId);
        if (!membership) throw new AppError(403, 'You do not have access to this business');
      }
      const existingMember = await businessService.getMembership(user.id, data.businessId);
      if (!existingMember) {
        await create(COL.businessMembers, {
          businessId: data.businessId,
          userId: user.id,
          role: Role.STAFF,
          isActive: true,
        });
      }
    }

    if (data.sendWelcomeEmail && config.email.configured) {
      sendStaffWelcomeEmail(user.email, user.name, data.password).catch(console.error);
    }

    return { ...user, staff: { ...staff, salary: Number(staff.salary) } };
  },

  async setPassword(id: string, password: string) {
    const user = await staffService.getById(id);
    if (!user.isActive) throw new AppError(400, 'Cannot reset password for disabled staff');

    try {
      validatePassword(password);
    } catch (e) {
      throw new AppError(400, e instanceof Error ? e.message : 'Invalid password');
    }

    const hashed = await hashPassword(password);
    await update<User>(COL.users, id, { password: hashed });
    return { message: 'Staff password updated' };
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      salary: number;
      joiningDate: string;
      jobType: StaffJobType;
    }>
  ) {
    await staffService.getById(id);
    const { phone, salary, joiningDate, jobType, ...userData } = data;

    if (Object.keys(userData).length) {
      await update<User>(COL.users, id, {
        ...userData,
        email: userData.email?.toLowerCase(),
      });
    }

    const staff = await findOne<Staff>(COL.staff, 'userId', id);
    if (staff && (phone !== undefined || salary !== undefined || joiningDate !== undefined || jobType !== undefined)) {
      await update<Staff>(COL.staff, staff.id, {
        phone,
        salary,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        jobType,
      });
    }

    return staffService.getById(id);
  },

  async disable(id: string) {
    await staffService.getById(id);
    await update<User>(COL.users, id, { isActive: false });
    return staffService.getById(id);
  },

  async enable(id: string) {
    await update<User>(COL.users, id, { isActive: true });
    return staffService.getById(id);
  },
};
