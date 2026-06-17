import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { asyncHandler, sendSuccess } from '../utils/response';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    sendSuccess(res, result);
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const data = forgotSchema.parse(req.body);
    const result = await authService.forgotPassword(data.email);
    sendSuccess(res, result);
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const data = resetSchema.parse(req.body);
    const result = await authService.resetPassword(data.token, data.password);
    sendSuccess(res, result);
  })
);

export default router;
