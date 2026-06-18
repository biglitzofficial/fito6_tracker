# Fito6 — Business Finance & Operations Tracker

A full-stack SaaS application for gyms and small businesses to track income, expenses, staff, attendance, tasks, documents, analytics, ledger, and reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, Recharts, Zustand, React Hook Form + Zod |
| Backend | Node.js, Express.js 5, JWT Authentication |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| DevOps | Docker, Docker Compose |

## Features

- **Role-Based Access** — Admin and Staff roles with granular permissions
- **Admin Dashboard** — Revenue, expenses, profit, cash flow, health score
- **General Ledger** — Running balance, filters, CSV export
- **Income & Expense Management** — Categories, filters, recurring expenses
- **Staff Management** — CRUD, disable/enable, salary tracking
- **Attendance** — Check in/out, late tracking, monthly reports
- **Task Management** — Assign, prioritize, status updates
- **Document Management** — Secure upload and authenticated download
- **Analytics & Reports** — Charts, CSV/Excel/PDF exports
- **Audit Logs** — Full action tracking

## Production Deployment

See **[RAILWAY.md](./RAILWAY.md)** for step-by-step Railway deployment (recommended).

### Docker (self-hosted)

### 1. Configure environment

```bash
cp .env.example .env
# Set strong values for POSTGRES_PASSWORD, JWT_SECRET (32+ chars), FRONTEND_URL, NEXT_PUBLIC_API_URL
```

For Firebase, copy `backend/.env.example` to `backend/.env` and add your service account credentials.

### 2. Start services

```bash
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

`db:seed` only adds **reference data** (categories and default settings). It does not create users or sample transactions.

### 3. Create the first admin (one time)

```bash
# In backend/.env set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
docker compose exec backend npm run db:bootstrap-admin
```

Password must be at least 8 characters with uppercase, lowercase, and a number.

### 4. Verify

- **Frontend:** your `FRONTEND_URL`
- **API health:** `{API_URL}/health` (includes database check)

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ (or Neon)
- npm

### Backend

```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
# Set ADMIN_EMAIL and ADMIN_PASSWORD, then:
npm run db:bootstrap-admin
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Project Structure

```
fito6_tracker/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts            # Reference data only
│   │   └── bootstrap-admin.ts # First admin setup
│   └── src/
│       ├── routes/
│       ├── services/
│       └── middleware/
└── frontend/
    └── src/
        ├── app/
        ├── components/
        └── lib/
```

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public (rate limited) |
| POST | `/api/auth/forgot-password` | Public (rate limited) |
| POST | `/api/auth/reset-password` | Public (rate limited) |
| GET | `/api/health` | Public |
| GET | `/api/dashboard` | Auth |
| CRUD | `/api/income` | Auth (delete: Admin) |
| CRUD | `/api/expenses` | Auth (delete: Admin) |
| CRUD | `/api/staff` | Admin |
| GET | `/api/ledger` | Admin |
| GET | `/api/analytics/*` | Admin |
| POST | `/api/reports/*` | Admin |
| GET | `/api/audit-logs` | Admin |

## Security

- JWT authentication with bcrypt (12 rounds)
- Strong password policy (8+ chars, mixed case, number)
- Role-based access control on protected routes
- Auth rate limiting (10 attempts / 15 min in production)
- Global rate limiting (150 req / 15 min in production)
- Helmet security headers
- Input validation with Zod
- Authenticated document downloads (no public file URLs)
- Production env validation (JWT, database URLs required)
- Audit logging for sensitive operations

## License

MIT
