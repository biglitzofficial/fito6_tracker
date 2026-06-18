import { CategoryType } from '../types/enums';
import { Category } from '../types/models';
import { COL, create, findMany, getById, sortBy, update } from '../lib/firestore';
import { AppError } from '../utils/response';

export const categoryService = {
  async list(type?: CategoryType) {
    const categories = await findMany<Category>(
      COL.categories,
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

  async create(data: { name: string; type: CategoryType; parentId?: string }) {
    const existing = (await findMany<Category>(COL.categories)).find(
      (c) => c.name === data.name && c.type === data.type && (c.parentId || null) === (data.parentId || null)
    );
    if (existing) return existing;
    return create<Category>(COL.categories, { ...data, isActive: true });
  },

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    const cat = await getById<Category>(COL.categories, id);
    if (!cat) throw new AppError(404, 'Category not found');
    return update<Category>(COL.categories, id, data);
  },

  async delete(id: string) {
    const cat = await getById<Category>(COL.categories, id);
    if (!cat) throw new AppError(404, 'Category not found');
    return update<Category>(COL.categories, id, { isActive: false });
  },
};
