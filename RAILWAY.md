# Deploy Fito6 on Railway

Deploy the backend and frontend from the [GitHub repo](https://github.com/biglitzofficial/fito6_tracker).

## Architecture

| Service  | Root directory | Storage        |
|----------|----------------|----------------|
| Backend  | `/backend`     | Firebase       |
| Frontend | `/frontend`    | —              |

Data is stored in **Firestore** (database) and **Firebase Storage** (document uploads).

## 1. Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Firestore** (production mode) and **Storage**.
3. Go to **Project settings → Service accounts → Generate new private key**.
4. Save the JSON — you will use it on Railway.

Firestore security rules can deny client access (the API uses the Admin SDK):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 2. Backend service

1. **+ Create** → **GitHub Repo** → select `fito6_tracker`.
2. **Settings**:
   - **Root Directory:** `backend`
   - **Config file:** `/backend/railway.toml`
3. **Variables:**

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Random string, **32+ characters** |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://fito6.biglitz.in` (your custom domain; **no trailing slash**) |
| `ALLOWED_ORIGINS` | *(optional)* `https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` if you still need the Railway URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON (single line) |
| `FIREBASE_STORAGE_BUCKET` | `your-project-id.appspot.com` |
| `SUPERADMIN_EMAILS` | `biglitz.official@gmail.com` *(product owner — auto Super Admin on login)* |

> Alternatively use `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` instead of `FIREBASE_SERVICE_ACCOUNT_JSON`.

4. **Networking** → **Generate Domain**.
5. Deploy and wait for **Healthy** (`/api/health`).

### One-time setup (after first deploy)

```bash
npm run db:seed
ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD=YourSecurePass1 ADMIN_NAME=Admin npm run db:bootstrap-admin
```

## 3. Frontend service

1. **+ Create** → **GitHub Repo** → same repo.
2. **Settings**:
   - **Root Directory:** `frontend`
3. **Variables:**

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api` |

4. **Networking** → **Generate Domain**.
5. Redeploy **backend** after changing `FRONTEND_URL` (CORS is enforced on the **backend** service, not the frontend).

### Custom domain (e.g. fito6.biglitz.in)

1. Add the custom domain on the **frontend** service in Railway → Networking.
2. On the **backend** service, set `FRONTEND_URL` to `https://fito6.biglitz.in` exactly (https, no trailing `/`).
3. Redeploy the **backend** (not just the frontend).
4. Keep `NEXT_PUBLIC_API_URL` on the frontend pointing at the **backend** Railway URL, e.g. `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api`.

If login fails with a CORS error in the browser console, open the backend deploy logs — blocked origins are logged with the list of allowed values.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and fill in Firebase credentials.
2. `cd backend && npm install && npm run dev`
3. `cd frontend && npm install && npm run dev`
4. Seed: `npm run db:seed` then bootstrap admin as above.
