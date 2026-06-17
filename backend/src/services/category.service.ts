import { CategoryType } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

export const categoryService = {
  async list(type?: CategoryType) {
    return prisma.category.findMany({
      where: { isActive: true, ...(type ? { type } : {}) },
      include: { children: true, parent: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  },

  async create(data: { name: string; type: CategoryType; parentId?: string }) {
    return prisma.category.create({ data });
  },

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError(404, 'Category not found');
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id: string) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError(404, 'Category not found');
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  },
};
