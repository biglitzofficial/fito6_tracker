import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

const LATE_HOUR = 9;
const LATE_MINUTE = 30;

export const attendanceService = {
  async checkIn(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const isLate = now.getHours() > LATE_HOUR || (now.getHours() === LATE_HOUR && now.getMinutes() > LATE_MINUTE);

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing?.checkIn) throw new AppError(400, 'Already checked in today');

    return prisma.attendance.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, checkIn: now, isLate },
      update: { checkIn: now, isLate },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  async checkOut(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existing?.checkIn) throw new AppError(400, 'Must check in first');
    if (existing.checkOut) throw new AppError(400, 'Already checked out today');

    return prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  async getHistory(userId: string, month?: number, year?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    return prisma.attendance.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'desc' },
    });
  },

  async getMonthlyReport(month?: number, year?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    return prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
    });
  },

  async getTodayStatus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } });
  },
};
