import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import incomeRoutes from './routes/income.routes';
import expenseRoutes from './routes/expense.routes';
import staffRoutes from './routes/staff.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';
import documentRoutes from './routes/document.routes';
import notificationRoutes from './routes/notification.routes';
import categoryRoutes from './routes/category.routes';
import reportRoutes from './routes/report.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditRoutes, { settingsRouter } from './routes/audit.routes';
import ledgerRoutes from './routes/ledger.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (no Origin) + local dev ports
      if (!origin) return cb(null, true);
      const allowed = new Set([config.frontendUrl, 'http://localhost:3000', 'http://localhost:3001']);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, error: 'Too many requests' },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(config.uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/settings', settingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
