import { COL, getById, setDoc } from '../lib/firestore';

export type ErpStoreDoc = {
  id: string;
  businessId: string;
  data: Record<string, unknown>;
  updatedById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export const erpStoreService = {
  async get(businessId: string) {
    const doc = await getById<ErpStoreDoc>(COL.erpStores, businessId);
    return doc?.data ?? null;
  },

  async save(businessId: string, data: Record<string, unknown>, updatedById: string) {
    const existing = await getById<ErpStoreDoc>(COL.erpStores, businessId);
    const record = await setDoc<ErpStoreDoc>(
      COL.erpStores,
      businessId,
      {
        businessId,
        data,
        updatedById,
      },
      !!existing
    );
    return { businessId: record.businessId, updatedAt: record.updatedAt, updatedById: record.updatedById };
  },
};
