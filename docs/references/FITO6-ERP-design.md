# FITO6 ERP (Claude) — Active product mode

On the `develop` branch, the **primary app** is the Claude single-file ERP SPA:

- Served at [`/fito6-erp.html`](../../frontend/public/fito6-erp.html)
- Root `/` and `/login` redirect to that page
- **Frontend + backend** run in the browser (`localStorage` via `load()` / `save()`)
- Express / Firestore SaaS routes remain in the repo for rollback but are **not** used by this UI

## Demo logins

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Super Admin |
| `office` | `office` | Front Office |
| `accounts` | `accounts` | Accountant |
| `trainer` | `trainer` | Trainer |

Data is **per browser** (localStorage). Clearing site data resets the demo DB unless you export a backup from Settings.

## Visual tokens

- bg: `#f4f6fa`
- card: `#ffffff`
- ink: `#1a2233`
- muted: `#6b7688`
- brand: `#ff6a00` / `#ff8c33`
- sidebar dark: `#141b2d` / `#1d2740`
- ok: `#18a558` · bad: `#e0393e` · warn: `#e8a10c` · line: `#e6eaf2`

## Rollback to Firestore SaaS

Checkout an earlier commit / `master` that still used Next.js dashboard + Express APIs, and redeploy. Firebase data is unchanged by the Claude SPA.
