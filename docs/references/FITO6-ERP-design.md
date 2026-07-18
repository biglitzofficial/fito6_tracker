# FITO6 ERP (Claude UI + Firestore)

Primary app: [`/fito6-erp.html`](../../frontend/public/fito6-erp.html)

## Storage

| Layer | Role |
|-------|------|
| Firestore `erp_stores/{businessId}` | Source of truth for Claude ERP JSON database |
| `localStorage` | Offline cache / migration upload of old browser-only data |
| Auth | JWT via `POST /api/auth/login` + `X-Business-Id` |

## Login

Use real admin/staff **email + password** (not demo `admin`/`admin`).

On first login for a business:

1. If cloud store is empty and the browser has older local data → that data is **uploaded** once to Firestore  
2. Otherwise a fresh empty ERP database is created in Firestore  

## API

- `GET /api/erp-store` — load ERP JSON for active business  
- `PUT /api/erp-store` — `{ data: { ...claudeDb } }` save full store  

Config for the static HTML: [`/fito6-config.json`](../../frontend/public/fito6-config.json) (written at frontend build from `NEXT_PUBLIC_API_URL`).

## Visual tokens

- bg: `#f4f6fa` · brand: `#ff6a00` · sidebar: `#141b2d`
