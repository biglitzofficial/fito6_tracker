import { Router } from 'express';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '../types/enums';
import { authenticate, AuthRequest, adminOnly } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { taskService } from '../services/task.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string(),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const assignedToId =
      req.user!.role === 'ADMIN' && req.query.assignedToId
        ? (req.query.assignedToId as string)
        : req.user!.role === 'STAFF'
          ? req.user!.userId
          : undefined;

    const result = await taskService.list({
      assignedToId,
      status: req.query.status as TaskStatus | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    sendSuccess(res, result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await taskService.getById(req.params.id);
    sendSuccess(res, task);
  })
);

router.post(
  '/',
  adminOnly,
  auditLog('CREATE_TASK', 'Task'),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createSchema.parse(req.body);
    const task = await taskService.create({ ...data, createdById: req.user!.userId });
    sendSuccess(res, task, 201);
  })
);

router.put(
  '/:id',
  adminOnly,
  auditLog('UPDATE_TASK', 'Task'),
  asyncHandler(async (req, res) => {
    const task = await taskService.update(req.params.id, req.body);
    sendSuccess(res, task);
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = z.object({ status: z.nativeEnum(TaskStatus) }).parse(req.body);
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const task = await taskService.updateStatus(id, status, req.user!.userId);
    sendSuccess(res, task);
  })
);

router.delete(
  '/:id',
  adminOnly,
  auditLog('DELETE_TASK', 'Task'),
  asyncHandler(async (req, res) => {
    const result = await taskService.delete(req.params.id);
    sendSuccess(res, result);
  })
);

export default router;
