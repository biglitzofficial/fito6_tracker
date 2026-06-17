import { TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

export const taskService = {
  async list(filters: { assignedToId?: string; status?: TaskStatus; page?: number; limit?: number }) {
    const { assignedToId, status, page = 1, limit = 20 } = filters;
    const where: Prisma.TaskWhereInput = {};
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new AppError(404, 'Task not found');
    return task;
  },

  async create(data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignedToId: string;
    createdById: string;
  }) {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || TaskPriority.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId,
        createdById: data.createdById,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    assignedToId: string;
  }>) {
    await taskService.getById(id);
    return prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async updateStatus(id: string, status: TaskStatus, userId: string) {
    const task = await taskService.getById(id);
    if (task.assignedToId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') throw new AppError(403, 'Can only update own tasks');
    }
    return prisma.task.update({
      where: { id },
      data: { status },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
  },

  async delete(id: string) {
    await taskService.getById(id);
    await prisma.task.delete({ where: { id } });
    return { message: 'Task deleted' };
  },
};
