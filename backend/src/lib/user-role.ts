import { Role } from '../types/enums';
import { User, Staff } from '../types/models';
import { COL, findOne, update } from '../lib/firestore';
import { config } from '../config';

export function isSuperAdminEmail(email: string): boolean {
  return config.superAdminEmails.includes(email.toLowerCase().trim());
}

export async function resolveUserRole(user: User & { id: string }): Promise<Role> {
  if (isSuperAdminEmail(user.email)) {
    if (user.role !== Role.SUPERADMIN) {
      await update<User>(COL.users, user.id, { role: Role.SUPERADMIN });
    }
    return Role.SUPERADMIN;
  }
  return user.role;
}

export async function attachStaff(user: User & { id: string }) {
  const staff = await findOne<Staff>(COL.staff, 'userId', user.id);
  const role = await resolveUserRole(user);
  const { password: _, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    role,
    staff: staff ? { ...staff, salary: Number(staff.salary) } : null,
  };
}
