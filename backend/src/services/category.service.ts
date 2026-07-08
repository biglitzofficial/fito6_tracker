import { CategoryType } from '../types/enums';
import { Category } from '../types/models';
import {
  COL,
  create,
  findManyForBusiness,
  getById,
  sortBy,
  update,
} from '../lib/firestore';
import { assertBusinessAccess } from '../lib/business-scope';
import { AppError } from '../utils/response';

export const categoryService = {
  async list(businessId: string, type?: CategoryType) {
    const categories = await findManyForBusiness<Category>(
      COL.categories,
      businessId,
      (c) => c.isActive && (!type || c.type === type)
    );
    const sorted = sortBy(categories, 'name', 'asc');
    const byId = new Map(sorted.map((c) => [c.id, c]));

    return sorted.map((cat) => ({
      ...cat,
      parent: cat.parentId ? byId.get(cat.parentId) || null : null,
      children: sorted.filter((c) => c.parentId === cat.id),
    }));
  },

  async create(data: {
    businessId: string;
    name: string;
    type: CategoryType;
    parentId?: string;
  }) {
    if (data.parentId && data.type === CategoryType.INCOME) {
      const parent = assertBusinessAccess(
        await getById<Category>(COL.categories, data.parentId),
        data.businessId,
        'Category'
      );
      if (parent.type !== CategoryType.INCOME || parent.parentId) {
        throw new AppError(400, 'Invalid income category group');
      }
    }

    if (data.parentId && data.type === CategoryType.EXPENSE) {
      const parent = assertBusinessAccess(
        await getById<Category>(COL.categories, data.parentId),
        data.businessId,
        'Category'
      );
      if (parent.type !== CategoryType.EXPENSE || parent.parentId) {
        throw new AppError(400, 'Invalid expense category group');
      }
    }

    const existing = (await findManyForBusiness<Category>(COL.categories, data.businessId)).find(
      (c) =>
        c.name === data.name &&
        c.type === data.type &&
        (c.parentId || null) === (data.parentId || null)
    );
    if (existing) return existing;
    return create<Category>(COL.categories, { ...data, isActive: true });
  },

  async update(
    businessId: string,
    id: string,
    data: { name?: string; isActive?: boolean; parentId?: string | null }
  ) {
    const cat = assertBusinessAccess(
      await getById<Category>(COL.categories, id),
      businessId,
      'Category'
    );

    const nextParentId =
      data.parentId !== undefined ? data.parentId || null : cat.parentId || null;

    if (cat.type === CategoryType.INCOME && nextParentId) {
      const parent = assertBusinessAccess(
        await getById<Category>(COL.categories, nextParentId),
        businessId,
        'Category'
      );
      if (parent.type !== CategoryType.INCOME || parent.parentId) {
        throw new AppError(400, 'Invalid income category group');
      }
    }

    if (data.parentId && cat.type === CategoryType.EXPENSE) {
      const parent = assertBusinessAccess(
        await getById<Category>(COL.categories, data.parentId),
        businessId,
        'Category'
      );
      if (parent.type !== CategoryType.EXPENSE || parent.parentId) {
        throw new AppError(400, 'Invalid expense category group');
      }
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length < 2) {
        throw new AppError(400, 'Category name must be at least 2 characters');
      }

      const duplicate = (await findManyForBusiness<Category>(COL.categories, businessId)).find(
        (c) =>
          c.id !== id &&
          c.isActive &&
          c.name === name &&
          c.type === cat.type &&
          (c.parentId || null) === nextParentId
      );
      if (duplicate) throw new AppError(409, 'Category already exists');

      data.name = name;
    }

    return update<Category>(COL.categories, id, {
      ...data,
      ...(data.parentId !== undefined ? { parentId: nextParentId ?? undefined } : {}),
    });
  },

  async delete(businessId: string, id: string) {
    assertBusinessAccess(await getById<Category>(COL.categories, id), businessId, 'Category');
    return update<Category>(COL.categories, id, { isActive: false });
  },
};
