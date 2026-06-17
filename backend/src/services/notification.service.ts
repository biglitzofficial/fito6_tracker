import { NotificationType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export const notificationService = {
  async list(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },

  async generateSystemNotifications() {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyExpense, monthlyIncome, pendingTasks] = await Promise.all([
      prisma.expense.aggregate({ where: { date: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { date: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.task.count({ where: { status: 'PENDING' } }),
    ]);

    const expense = Number(monthlyExpense._sum.amount || 0);
    const income = Number(monthlyIncome._sum.amount || 0);

    for (const admin of admins) {
      if (expense > income * 0.8) {
        await notificationService.create({
          userId: admin.id,
          type: NotificationType.HIGH_EXPENSE,
          title: 'High Expenses Alert',
          message: 'Monthly expenses are approaching 80% of revenue.',
        });
      }
      if (income - expense < 0) {
        await notificationService.create({
          userId: admin.id,
          type: NotificationType.LOW_CASH_FLOW,
          title: 'Low Cash Flow',
          message: 'Cash flow is negative this month. Review expenses.',
        });
      }
      if (pendingTasks > 0) {
        await notificationService.create({
          userId: admin.id,
          type: NotificationType.PENDING_TASK,
          title: 'Pending Tasks',
          message: `${pendingTasks} tasks are still pending.`,
        });
      }
    }
  },
};
