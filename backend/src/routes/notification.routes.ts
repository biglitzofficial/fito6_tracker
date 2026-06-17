import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notification.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const notifications = await notificationService.list(
      req.user!.userId,
      req.query.unreadOnly === 'true'
    );
    sendSuccess(res, notifications);
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: AuthRequest, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    await notificationService.markRead(id, req.user!.userId);
    sendSuccess(res, { message: 'Marked as read' });
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (req: AuthRequest, res) => {
    await notificationService.markAllRead(req.user!.userId);
    sendSuccess(res, { message: 'All marked as read' });
  })
);

export default router;
