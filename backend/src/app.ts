import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, normalizeOrigin } from './config';
import { pingFirebase } from './lib/firebase';
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
import accountRoutes from './routes/account.routes';
import partyRoutes from './routes/party.routes';
import reportRoutes from './routes/report.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditRoutes, { settingsRouter } from './routes/audit.routes';
import ledgerRoutes from './routes/ledger.routes';
import profitLossRoutes from './routes/profit-loss.routes';

const app = express();

if (config.isProduction) {
  app.set('trust proxy', 1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const allowed = new Set(config.allowedOrigins);
      if (!config.isProduction) {
        allowed.add('http://localhost:3000');
        allowed.add('http://localhost:3001');
      }

      if (allowed.has(normalizeOrigin(origin))) return cb(null, true);

      if (config.isProduction) {
        console.warn(
          `CORS blocked origin: ${origin} (allowed: ${[...allowed].join(', ') || 'none'})`
        );
      }

      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.isProduction ? 150 : 200,
    message: { success: false, error: 'Too many requests' },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (_req, res) => {
  try {
    await pingFirebase();
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ success: false, status: 'degraded', error: 'Firebase unavailable' });
  }
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
app.use('/api/accounts', accountRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/profit-loss', profitLossRoutes);
app.use('/api/settings', settingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
