# Deploy Fito6 on Railway

Deploy the backend, frontend, and PostgreSQL database from the [GitHub repo](https://github.com/biglitzofficial/fito6_tracker).

## Architecture

| Service   | Root directory | Port (internal) |
|-----------|----------------|-----------------|
| PostgreSQL | Railway plugin | 5432            |
| Backend   | `/backend`     | Railway `PORT`  |
| Frontend  | `/frontend`    | Railway `PORT`  |

## 1. Create Railway project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select `biglitzofficial/fito6_tracker`.
3. Add **PostgreSQL** from **+ Create** → **Database** → **PostgreSQL**.

## 2. Backend service

1. **+ Create** → **GitHub Repo** → same repo (or duplicate the connected repo service).
2. Open service **Settings**:
   - **Root Directory:** `backend` (required — do not leave as `/`)
   - **Config file:** `/backend/railway.toml`
   - **Custom Start Command** (if Railpack error): `npm run start:prod`
3. **Variables** (Settings → Variables):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Random string, **32+ characters** |
| `JWT_EXPIRES_IN` | `7d` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` |
| `FRONTEND_URL` | `https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `UPLOAD_DIR` | `/app/uploads` |

4. **Networking** → **Generate Domain** (e.g. `fito6-api-production.up.railway.app`).
5. Deploy and wait for **Healthy** (`/api/health`).

### One-time setup (after first deploy)

Open the backend service **Shell** or use Railway CLI:

```bash
npm run db:seed
```

Set bootstrap variables temporarily, then run:

```bash
ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD=YourSecurePass1 ADMIN_NAME=Admin npm run db:bootstrap-admin
```

Remove `ADMIN_PASSWORD` from variables after bootstrap.

## 3. Frontend service

1. **+ Create** → **GitHub Repo** → same repo.
2. **Settings**:
   - **Root Directory:** `frontend` (required)
   - **Config file:** `/frontend/railway.toml`
   - **Custom Start Command** (if needed): `npm run start`
3. **Variables:**

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api` |

> `NEXT_PUBLIC_API_URL` must be set **before** the first frontend build. Redeploy after changing it.

4. **Networking** → **Generate Domain**.
5. Redeploy **backend** so `FRONTEND_URL` picks up the frontend domain (if you set it before frontend existed).

## 4. Service naming for variables

Railway references use your **service names** in the dashboard. If your services are not named `Backend` and `Frontend`, adjust:

- `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` → `${{YourBackendServiceName.RAILWAY_PUBLIC_DOMAIN}}`
- `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` → `${{YourFrontendServiceName.RAILWAY_PUBLIC_DOMAIN}}`
- `${{Postgres.DATABASE_URL}}` → `${{YourPostgresServiceName.DATABASE_URL}}`

Rename services in Railway to **Backend**, **Frontend**, and **Postgres** to match the table above.

## 5. Verify

- API health: `https://<backend-domain>/api/health`
- App: `https://<frontend-domain>`
- Log in with the admin account from bootstrap.

## 6. Optional: persistent uploads

Uploaded documents use local disk. On Railway, add a **Volume** mounted at `/app/uploads` on the backend service to keep files across redeploys.

## 7. Deploy updates

Push to `master` on GitHub — Railway redeploys automatically if GitHub integration is enabled.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **No start command detected** | Set **Root Directory** to `backend` or `frontend`. Add **Custom Start Command**: `npm run start:prod` (backend) or `npm run start` (frontend). |
| CORS error in browser | Set `FRONTEND_URL` to exact frontend URL with `https://`, redeploy backend |
| API calls wrong host | Rebuild frontend after fixing `NEXT_PUBLIC_API_URL` |
| `JWT_SECRET` error | Use 32+ char random secret |
| DB connection failed | Link Postgres to backend; set `DATABASE_URL` and `DIRECT_URL` |
| Login 401 after deploy | Run `db:bootstrap-admin` if no admin exists yet |

## Railway CLI (optional)

```bash
npm i -g @railway/cli
railway login
railway link
cd backend && railway up
```
