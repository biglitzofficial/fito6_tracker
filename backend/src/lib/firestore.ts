import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';

export const COL = {
  users: 'users',
  businesses: 'businesses',
  businessMembers: 'business_members',
  staff: 'staff',
  categories: 'categories',
  accounts: 'accounts',
  parties: 'parties',
  income: 'income',
  expenses: 'expenses',
  attendance: 'attendance',
  tasks: 'tasks',
  documents: 'documents',
  notifications: 'notifications',
  reports: 'reports',
  auditLogs: 'audit_logs',
  settings: 'settings',
  counters: 'counters',
} as const;

const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'date',
  'joiningDate',
  'checkIn',
  'checkOut',
  'dueDate',
  'dateFrom',
  'dateTo',
  'resetTokenExp',
]);

function toDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date(0);
}

function serialize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value instanceof Date) out[key] = value.toISOString();
    else out[key] = value;
  }
  return out;
}

export function deserializeDoc<T>(id: string, data: FirebaseFirestore.DocumentData): T & { id: string } {
  const result: Record<string, unknown> = { id, ...data };
  for (const key of DATE_FIELDS) {
    if (result[key] != null) result[key] = toDate(result[key]);
  }
  return result as T & { id: string };
}

export async function getById<T>(collection: string, id: string): Promise<(T & { id: string }) | null> {
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return deserializeDoc<T>(snap.id, snap.data()!);
}

export async function findOne<T>(
  collection: string,
  field: string,
  value: unknown
): Promise<(T & { id: string }) | null> {
  const snap = await db.collection(collection).where(field, '==', value).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return deserializeDoc<T>(doc.id, doc.data());
}

export async function findManyForBusiness<T extends { businessId?: string | null }>(
  collection: string,
  businessId: string,
  predicate?: (item: T & { id: string }) => boolean
): Promise<(T & { id: string })[]> {
  return findMany<T>(collection, (item) => {
    if (item.businessId !== businessId) return false;
    return predicate ? predicate(item) : true;
  });
}

export async function findMany<T>(
  collection: string,
  predicate?: (item: T & { id: string }) => boolean
): Promise<(T & { id: string })[]> {
  const snap = await db.collection(collection).get();
  let items = snap.docs.map((doc) => deserializeDoc<T>(doc.id, doc.data()));
  if (predicate) items = items.filter(predicate);
  return items;
}

export async function create<T extends object>(
  collection: string,
  data: object,
  id?: string
): Promise<T & { id: string }> {
  const docId = id || uuidv4();
  const now = new Date().toISOString();
  const payload = serialize({ ...data, createdAt: now, updatedAt: now });
  await db.collection(collection).doc(docId).set(payload);
  return (await getById<T>(collection, docId))!;
}

export async function update<T extends object>(
  collection: string,
  id: string,
  data: Partial<T>
): Promise<T & { id: string }> {
  const payload = serialize({ ...data, updatedAt: new Date().toISOString() });
  await db.collection(collection).doc(id).update(payload);
  return (await getById<T>(collection, id))!;
}

export async function setDoc<T extends object>(
  collection: string,
  id: string,
  data: object,
  merge = false
): Promise<T & { id: string }> {
  const now = new Date().toISOString();
  const payload = serialize(merge ? { ...data, updatedAt: now } : { ...data, createdAt: now, updatedAt: now });
  await db.collection(collection).doc(id).set(payload, { merge });
  return (await getById<T>(collection, id))!;
}

export async function remove(collection: string, id: string): Promise<void> {
  await db.collection(collection).doc(id).delete();
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export function sortBy<T>(items: T[], field: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const av = a[field] as unknown;
    const bv = b[field] as unknown;
    let cmp = 0;
    if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
    else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function matchesSearch(search: string | undefined, ...values: (string | null | undefined)[]): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return values.some((v) => (v || '').toLowerCase().includes(q));
}

export function inDateRange(date: Date, from?: Date, to?: Date): boolean {
  const t = date.getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function attendanceDocId(userId: string, date: Date): string {
  return `${userId}_${startOfDay(date).toISOString().split('T')[0]}`;
}

export function sumAmounts(
  items: { amount: number | unknown; date: Date }[],
  since?: Date,
  until?: Date
): number {
  return items
    .filter((item) => inDateRange(item.date, since, until))
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

export async function getUserMap(ids: string[]) {
  const unique = [...new Set(ids)];
  const users = await Promise.all(unique.map((id) => getById<{ name: string; email?: string; role?: string }>(COL.users, id)));
  return new Map(unique.map((id, i) => [id, users[i]]));
}

export async function getCategoryMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const categories = await Promise.all(unique.map((id) => getById<{ name: string; type?: string }>(COL.categories, id)));
  return new Map(unique.map((id, i) => [id, categories[i]]));
}

export async function getAccountMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const accounts = await Promise.all(
    unique.map((id) => getById<{ name: string; type: string }>(COL.accounts, id))
  );
  return new Map(unique.map((id, i) => [id, accounts[i]]));
}

export async function getPartyMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const parties = await Promise.all(
    unique.map((id) => getById<{ name: string; type: string }>(COL.parties, id))
  );
  return new Map(unique.map((id, i) => [id, parties[i]]));
}
