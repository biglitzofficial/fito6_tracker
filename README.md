# Fito6 — Business Finance & Operations Tracker

A premium full-stack SaaS application for gyms and small businesses to track income, expenses, staff, attendance, tasks, documents, analytics, and reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, Recharts, Zustand, React Hook Form + Zod |
| Backend | Node.js, Express.js 5, JWT Authentication |
| Database | PostgreSQL, Prisma ORM |
| DevOps | Docker, Docker Compose |

## Features

- **Role-Based Access** — Admin and Staff roles with granular permissions
- **Admin Dashboard** — Revenue, expenses, profit, cash flow, health score, AI insights
- **Staff Dashboard** — Attendance, tasks, recent entries
- **Income & Expense Management** — Categories, filters, recurring expenses, attachments
- **Staff Management** — CRUD, disable/enable, salary tracking
- **Attendance** — Check in/out, late tracking, monthly reports
- **Task Management** — Assign, prioritize, status updates
- **Document Management** — Upload bills, invoices, receipts
- **Analytics** — Revenue, expense breakdown, profit, cash flow charts
- **Reports** — Income, expense, P&L, attendance (CSV/Excel/PDF)
- **Notifications** — Salary due, high expenses, low cash flow alerts
- **Audit Logs** — Full action tracking with IP and user agent
- **Premium UI** — Dark glassmorphism theme, command palette (⌘K), responsive design

## Quick Start with Docker

```bash
# Clone and configure
cp .env.example .env

# Start all services
docker compose up --build

# Seed database (run in backend container)
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/api
- **Health:** http://localhost:4000/api/health

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- npm

### Backend

```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fito6.com | Admin@123 |
| Staff | john@fito6.com | Staff@123 |

## Project Structure

```
fito6_tracker/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database models
│   │   ├── seed.ts            # Demo data
│   │   └── migrations/
│   └── src/
│       ├── routes/            # API routes
│       ├── services/          # Business logic
│       ├── middleware/        # Auth, audit, upload
│       └── utils/             # JWT, password helpers
└── frontend/
    └── src/
        ├── app/               # Next.js App Router pages
        ├── components/        # UI components
        ├── lib/               # API client, utilities
        ├── stores/            # Zustand state
        └── types/             # TypeScript types
```

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |
| GET | `/api/dashboard` | Auth |
| CRUD | `/api/income` | Auth (delete: Admin) |
| CRUD | `/api/expenses` | Auth (delete: Admin) |
| CRUD | `/api/staff` | Admin |
| POST | `/api/attendance/check-in` | Auth |
| CRUD | `/api/tasks` | Auth |
| GET | `/api/analytics/*` | Admin |
| POST | `/api/reports/*` | Admin |
| GET | `/api/audit-logs` | Admin |

## Security

- JWT authentication with bcrypt password hashing (12 rounds)
- Role-based access control on all protected routes
- Rate limiting (200 req/15min)
- Helmet security headers
- Input validation with Zod
- Audit logging for sensitive operations

## License

MIT
