# Fito6 — Gym ERP

## Active product (Claude ERP replica)

On **`develop`**, the primary app is the **Claude FITO6 single-file ERP** (HTML/JS + `localStorage`):

- Open `/` or `/login` → redirects to **`/fito6-erp.html`**
- Frontend and “backend” both run in the browser (no Firestore calls for gym ops)
- Express/Firestore SaaS code remains in the repo for rollback; it is unused by this UI

### Demo logins

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Super Admin |
| `office` | `office` | Front Office |
| `accounts` | `accounts` | Accountant |
| `trainer` | `trainer` | Trainer |

Data is stored **per browser**. Use Settings → backup/export in the Claude UI if you need a copy. See [docs/references/FITO6-ERP-design.md](./docs/references/FITO6-ERP-design.md).

### Run Claude ERP locally

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000/` (redirects to `/fito6-erp.html`).

---

## Legacy stack (Firestore SaaS — rollback)

The Next.js dashboard + Express + Firebase stack is still in this repository (git history / unused routes). Use it only if you redeploy a pre–Claude-ERP commit / `master`.

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | Node.js, Express.js 5, JWT Authentication |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| DevOps | Docker, Docker Compose |

Legacy features included role-based admin/staff access, ledger, income/expense, staff, attendance, tasks, documents, analytics, and audit logs.

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
