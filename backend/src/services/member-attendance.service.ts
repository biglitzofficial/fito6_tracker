import { MemberAttendance, Party } from '../types/models';
import {
  COL,
  findManyForBusiness,
  getById,
  getPartyMap,
  inDateRange,
  memberAttendanceDocId,
  setDoc,
  sortBy,
  startOfDay,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { AppError } from '../utils/response';

async function withParty(record: MemberAttendance) {
  const party = await getById<Party>(COL.parties, record.partyId);
  return {
    ...record,
    party: party
      ? { id: party.id, name: party.name, phone: party.phone }
      : { id: record.partyId, name: 'Unknown', phone: null },
  };
}

export const memberAttendanceService = {
  async checkIn(businessId: string, partyId: string, checkedInById: string, notes?: string) {
    const party = assertBusinessAccess(
      await getById<Party>(COL.parties, partyId),
      businessId,
      'Party'
    );
    if (!party.isActive) throw new AppError(400, 'Client is inactive');

    const today = startOfDay(new Date());
    const now = new Date();
    const docId = memberAttendanceDocId(businessId, partyId, today);
    const existing = await getById<MemberAttendance>(COL.memberAttendance, docId);
    if (existing?.checkIn) throw new AppError(400, 'Member already checked in today');

    const record = await setDoc<MemberAttendance>(
      COL.memberAttendance,
      docId,
      {
        businessId,
        partyId,
        date: today,
        checkIn: now,
        checkOut: existing?.checkOut || null,
        notes: notes || existing?.notes || null,
        checkedInById,
      },
      !!existing
    );

    return withParty(record);
  },

  async checkOut(businessId: string, partyId: string) {
    const today = startOfDay(new Date());
    const docId = memberAttendanceDocId(businessId, partyId, today);
    const existing = assertBusinessAccess(
      await getById<MemberAttendance>(COL.memberAttendance, docId),
      businessId,
      'Member attendance'
    );

    if (!existing.checkIn) throw new AppError(400, 'Member must check in first');
    if (existing.checkOut) throw new AppError(400, 'Member already checked out today');

    const record = await update<MemberAttendance>(COL.memberAttendance, docId, {
      checkOut: new Date(),
    });
    return withParty(record);
  },

  async listToday(businessId: string) {
    const today = startOfDay(new Date());
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const items = await findManyForBusiness<MemberAttendance>(
      COL.memberAttendance,
      businessId,
      (a) => inDateRange(a.date, today, end)
    );
    const sorted = sortBy(items, 'checkIn', 'desc');
    const partyMap = await getPartyMap(sorted.map((a) => a.partyId));
    return sorted.map((a) => ({
      ...a,
      party: partyMap.get(a.partyId)
        ? {
            id: a.partyId,
            name: partyMap.get(a.partyId)!.name,
            phone: partyMap.get(a.partyId)!.phone,
          }
        : { id: a.partyId, name: 'Unknown', phone: null },
    }));
  },

  async listByDate(businessId: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? startOfDay(new Date(dateFrom)) : startOfDay(new Date());
    const to = dateTo ? new Date(dateTo) : new Date(from);
    to.setHours(23, 59, 59, 999);

    const items = await findManyForBusiness<MemberAttendance>(
      COL.memberAttendance,
      businessId,
      (a) => inDateRange(a.date, from, to)
    );
    const sorted = sortBy(items, 'checkIn', 'desc');
    const partyMap = await getPartyMap(sorted.map((a) => a.partyId));
    return sorted.map((a) => ({
      ...a,
      party: partyMap.get(a.partyId)
        ? {
            id: a.partyId,
            name: partyMap.get(a.partyId)!.name,
            phone: partyMap.get(a.partyId)!.phone,
          }
        : { id: a.partyId, name: 'Unknown', phone: null },
    }));
  },
};
