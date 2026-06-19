import { Role } from '../types/enums';
import { User, Staff } from '../types/models';
import { COL, create, findMany, findOne, getById, sortBy, update } from '../lib/firestore';
import { hashPassword, validatePassword } from '../utils/password';
import { sendStaffWelcomeEmail } from '../lib/email';
import { AppError } from '../utils/response';
import { config } from '../config';

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
    sendWelcomeEmail?: boolean;
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
    });

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
    }>
  ) {
    await staffService.getById(id);
    const { phone, salary, joiningDate, ...userData } = data;

    if (Object.keys(userData).length) {
      await update<User>(COL.users, id, {
        ...userData,
        email: userData.email?.toLowerCase(),
      });
    }

    const staff = await findOne<Staff>(COL.staff, 'userId', id);
    if (staff && (phone !== undefined || salary !== undefined || joiningDate !== undefined)) {
      await update<Staff>(COL.staff, staff.id, {
        phone,
        salary,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
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
