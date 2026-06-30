import { db } from './firebase';
import { COL } from './firestore';

export async function nextIncomeReceiptNumber(businessId: string, date: Date): Promise<string> {
  const year = date.getFullYear();
  const counterId = `income_receipt_${businessId}_${year}`;
  const ref = db.collection(COL.counters).doc(counterId);

  const seq = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists ? Number(snap.data()?.lastNumber) || 0 : 0;
    const next = last + 1;
    tx.set(
      ref,
      { lastNumber: next, businessId, year, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return next;
  });

  return `RV-${year}-${String(seq).padStart(4, '0')}`;
}

export async function nextExpenseVoucherNumber(businessId: string, date: Date): Promise<string> {
  const year = date.getFullYear();
  const counterId = `expense_voucher_${businessId}_${year}`;
  const ref = db.collection(COL.counters).doc(counterId);

  const seq = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists ? Number(snap.data()?.lastNumber) || 0 : 0;
    const next = last + 1;
    tx.set(
      ref,
      { lastNumber: next, businessId, year, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return next;
  });

  return `PV-${year}-${String(seq).padStart(4, '0')}`;
}
