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
| `FRONTEND_URL` | `https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON (single line) |
| `FIREBASE_STORAGE_BUCKET` | `your-project-id.appspot.com` |

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
5. Redeploy **backend** so `FRONTEND_URL` matches the frontend domain.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and fill in Firebase credentials.
2. `cd backend && npm install && npm run dev`
3. `cd frontend && npm install && npm run dev`
4. Seed: `npm run db:seed` then bootstrap admin as above.
