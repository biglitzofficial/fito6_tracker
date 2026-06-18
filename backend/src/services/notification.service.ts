import { NotificationType, Role } from '../types/enums';
import { Notification, User } from '../types/models';
import { COL, create, findMany, sortBy, sumAmounts, update } from '../lib/firestore';

export const notificationService = {
  async list(userId: string, unreadOnly = false) {
    const items = await findMany<Notification>(COL.notifications, (n) => {
      if (n.userId !== userId) return false;
      if (unreadOnly && n.isRead) return false;
      return true;
    });
    return sortBy(items, 'createdAt', 'desc').slice(0, 50);
  },

  async markRead(id: string, userId: string) {
    const notification = (await findMany<Notification>(COL.notifications, (n) => n.id === id && n.userId === userId))[0];
    if (notification) await update<Notification>(COL.notifications, id, { isRead: true });
    return { count: notification ? 1 : 0 };
  },

  async markAllRead(userId: string) {
    const unread = await findMany<Notification>(COL.notifications, (n) => n.userId === userId && !n.isRead);
    await Promise.all(unread.map((n) => update<Notification>(COL.notifications, n.id, { isRead: true })));
    return { count: unread.length };
  },

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return create<Notification>(COL.notifications, {
      ...data,
      isRead: false,
    });
  },

  async generateSystemNotifications() {
    const admins = await findMany<User>(COL.users, (u) => u.role === Role.ADMIN && u.isActive);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [incomes, expenses, tasks] = await Promise.all([
      findMany<{ amount: number; date: Date }>(COL.income, (i) => i.date >= startOfMonth),
      findMany<{ amount: number; date: Date }>(COL.expenses, (e) => e.date >= startOfMonth),
      findMany<{ status: string }>(COL.tasks, (t) => t.status === 'PENDING'),
    ]);

    const income = sumAmounts(incomes, startOfMonth);
    const expense = sumAmounts(expenses, startOfMonth);
    const pendingTasks = tasks.length;

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
