import { TaskPriority, TaskStatus } from '../types/enums';
import { Task, User } from '../types/models';
import {
  COL,
  create,
  findMany,
  getById,
  getUserMap,
  paginate,
  remove,
  sortBy,
  update,
} from '../lib/firestore';
import { AppError } from '../utils/response';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

async function withRelations(items: Task[]) {
  const userIds = items.flatMap((t) => [t.assignedToId, t.createdById]);
  const userMap = await getUserMap(userIds);

  return items.map((task) => ({
    ...task,
    assignedTo: {
      id: task.assignedToId,
      name: userMap.get(task.assignedToId)?.name || 'Unknown',
      email: userMap.get(task.assignedToId)?.email,
    },
    createdBy: {
      id: task.createdById,
      name: userMap.get(task.createdById)?.name || 'Unknown',
    },
  }));
}

export const taskService = {
  async list(filters: { assignedToId?: string; status?: TaskStatus; page?: number; limit?: number }) {
    const { assignedToId, status, page = 1, limit = 20 } = filters;

    let items = await findMany<Task>(COL.tasks, (task) => {
      if (assignedToId && task.assignedToId !== assignedToId) return false;
      if (status && task.status !== status) return false;
      return true;
    });

    items.sort((a, b) => {
      const p = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (p !== 0) return p;
      const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
      const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
      return ad - bd;
    });

    const paged = paginate(items, page, limit);
    return { ...paged, items: await withRelations(paged.items) };
  },

  async getById(id: string) {
    const task = await getById<Task>(COL.tasks, id);
    if (!task) throw new AppError(404, 'Task not found');
    return (await withRelations([task]))[0];
  },

  async create(data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignedToId: string;
    createdById: string;
  }) {
    const task = await create<Task>(COL.tasks, {
      title: data.title,
      description: data.description,
      status: TaskStatus.PENDING,
      priority: data.priority || TaskPriority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedToId: data.assignedToId,
      createdById: data.createdById,
    });
    return (await withRelations([task]))[0];
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string;
      assignedToId: string;
    }>
  ) {
    await taskService.getById(id);
    const task = await update<Task>(COL.tasks, id, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
    return (await withRelations([task]))[0];
  },

  async updateStatus(id: string, status: TaskStatus, userId: string) {
    const task = await taskService.getById(id);
    if (task.assignedToId !== userId) {
      const user = await getById<User>(COL.users, userId);
      if (user?.role !== 'ADMIN') throw new AppError(403, 'Can only update own tasks');
    }
    const updated = await update<Task>(COL.tasks, id, { status });
    return (await withRelations([updated]))[0];
  },

  async delete(id: string) {
    await taskService.getById(id);
    await remove(COL.tasks, id);
    return { message: 'Task deleted' };
  },
};
