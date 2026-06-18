import { Attendance, User } from '../types/models';
import {
  COL,
  attendanceDocId,
  findMany,
  getById,
  getUserMap,
  inDateRange,
  setDoc,
  sortBy,
  startOfDay,
  update,
} from '../lib/firestore';
import { AppError } from '../utils/response';

const LATE_HOUR = 9;
const LATE_MINUTE = 30;

async function withUser(record: Attendance) {
  const user = await getById<User>(COL.users, record.userId);
  return {
    ...record,
    user: user
      ? { id: user.id, name: user.name, email: user.email }
      : { id: record.userId, name: 'Unknown', email: '' },
  };
}

export const attendanceService = {
  async checkIn(userId: string) {
    const today = startOfDay(new Date());
    const now = new Date();
    const isLate =
      now.getHours() > LATE_HOUR || (now.getHours() === LATE_HOUR && now.getMinutes() > LATE_MINUTE);

    const docId = attendanceDocId(userId, today);
    const existing = await getById<Attendance>(COL.attendance, docId);
    if (existing?.checkIn) throw new AppError(400, 'Already checked in today');

    const record = await setDoc<Attendance>(
      COL.attendance,
      docId,
      {
        userId,
        date: today,
        checkIn: now,
        checkOut: existing?.checkOut || null,
        isLate,
        notes: existing?.notes || null,
      },
      !!existing
    );

    return withUser(record);
  },

  async checkOut(userId: string) {
    const today = startOfDay(new Date());
    const now = new Date();
    const docId = attendanceDocId(userId, today);
    const existing = await getById<Attendance>(COL.attendance, docId);

    if (!existing?.checkIn) throw new AppError(400, 'Must check in first');
    if (existing.checkOut) throw new AppError(400, 'Already checked out today');

    const record = await update<Attendance>(COL.attendance, docId, { checkOut: now });
    return withUser(record);
  },

  async getHistory(userId: string, month?: number, year?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const items = await findMany<Attendance>(
      COL.attendance,
      (a) => a.userId === userId && inDateRange(a.date, start, end)
    );
    return sortBy(items, 'date', 'desc');
  },

  async getMonthlyReport(month?: number, year?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const items = await findMany<Attendance>(COL.attendance, (a) => inDateRange(a.date, start, end));
    const userMap = await getUserMap(items.map((a) => a.userId));

    return sortBy(
      items.map((a) => ({
        ...a,
        user: {
          id: a.userId,
          name: userMap.get(a.userId)?.name || 'Unknown',
          email: userMap.get(a.userId)?.email || '',
        },
      })),
      'date',
      'desc'
    );
  },

  async getTodayStatus(userId: string) {
    const today = startOfDay(new Date());
    return getById<Attendance>(COL.attendance, attendanceDocId(userId, today));
  },
};
