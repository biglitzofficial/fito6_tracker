import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { signToken, generateResetToken } from '../utils/jwt';
import { AppError } from '../utils/response';
import { config } from '../config';

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { staff: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
        },
      })
      .catch(console.error);

    const { password: _, ...userWithoutPassword } = user;
    return {
      token,
      user: {
        ...userWithoutPassword,
        staff: user.staff
          ? { ...user.staff, salary: Number(user.staff.salary) }
          : null,
      },
    };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { message: 'If account exists, reset link sent' };

    const resetToken = generateResetToken();
    const resetTokenExp = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    return {
      message: 'If account exists, reset link sent',
      resetToken: !config.isProduction ? resetToken : undefined,
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!user) throw new AppError(400, 'Invalid or expired reset token');

    try {
      validatePassword(newPassword);
    } catch (e) {
      throw new AppError(400, e instanceof Error ? e.message : 'Invalid password');
    }
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExp: null },
    });

    return { message: 'Password reset successful' };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        staff: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    return {
      ...user,
      staff: user.staff ? { ...user.staff, salary: Number(user.staff.salary) } : null,
    };
  },
};
