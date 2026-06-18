import { Role } from '../types/enums';
import { User, Staff } from '../types/models';
import { COL, create, findMany, findOne, getById, update } from '../lib/firestore';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { signToken, generateResetToken } from '../utils/jwt';
import { AppError } from '../utils/response';
import { config } from '../config';

async function attachStaff(user: User & { id: string }) {
  const staff = await findOne<Staff>(COL.staff, 'userId', user.id);
  const { password: _, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    staff: staff ? { ...staff, salary: Number(staff.salary) } : null,
  };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await findOne<User>(COL.users, 'email', email.toLowerCase());
    if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials');

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    create(COL.auditLogs, {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
    }).catch(console.error);

    return { token, user: await attachStaff(user) };
  },

  async forgotPassword(email: string) {
    const user = await findOne<User>(COL.users, 'email', email.toLowerCase());
    if (!user) return { message: 'If account exists, reset link sent' };

    const resetToken = generateResetToken();
    const resetTokenExp = new Date(Date.now() + 3600000);

    await update<User>(COL.users, user.id, { resetToken, resetTokenExp });

    return {
      message: 'If account exists, reset link sent',
      resetToken: !config.isProduction ? resetToken : undefined,
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const users = await findMany<User>(
      COL.users,
      (u) => u.resetToken === token && !!u.resetTokenExp && u.resetTokenExp > new Date()
    );
    const user = users[0];
    if (!user) throw new AppError(400, 'Invalid or expired reset token');

    try {
      validatePassword(newPassword);
    } catch (e) {
      throw new AppError(400, e instanceof Error ? e.message : 'Invalid password');
    }

    const hashed = await hashPassword(newPassword);
    await update<User>(COL.users, user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExp: null,
    });

    return { message: 'Password reset successful' };
  },

  async getProfile(userId: string) {
    const user = await getById<User>(COL.users, userId);
    if (!user) throw new AppError(404, 'User not found');

    const staff = await findOne<Staff>(COL.staff, 'userId', userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      staff: staff ? { ...staff, salary: Number(staff.salary) } : null,
    };
  },
};
