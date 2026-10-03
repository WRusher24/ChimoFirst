# Chimo (כימו) — Deployment & Local Development Guide

Chimo (**כימו**) is a full-stack industrial batch-tracking system for detergent factories, built with **Next.js (App Router)**, **Tailwind CSS v4**, **Drizzle ORM**, and **PostgreSQL**. The entire UI is native Hebrew with full RTL layout.

**New in v2.0:** mandatory company login (Level-1 auth), supervisor-only formula management (Level-2 password gate), quality-control input steps (pH, temperature…), manual Step-1 start, a 3-second global chime alert, and a clean industrial-lab light theme.

---

## 1. Prerequisites

| Tool       | Version  | Notes                                        |
| ---------- | -------- | -------------------------------------------- |
| Node.js    | ≥ 20.x   | LTS recommended                              |
| npm        | ≥ 10.x   | Bundled with Node                            |
| PostgreSQL | ≥ 14.x   | Local instance, Docker, or a managed service |

## 2. Environment Variables

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# Level-1 company login (CHANGE IN PRODUCTION!)
CHIMO_ADMIN_USER=admin
CHIMO_ADMIN_PASSWORD=chimo-2026

# Secret used to sign the stateless session cookies (CHANGE IN PRODUCTION!)
CHIMO_SESSION_SECRET=any-long-random-string
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `CHIMO_ADMIN_USER` | `admin` | Master company username for the login screen |
| `CHIMO_ADMIN_PASSWORD` | `chimo-2026` | Master company password — also used to unlock Formula Management |
| `CHIMO_SESSION_SECRET` | built-in dev value | HMAC key that signs session cookies; set a strong random value in production |

## 3. Install & Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Push the database schema (creates/updates all tables)
npx drizzle-kit push

# 3. Seed starter data: 5 employees (with PINs) + 3 detergent formulas
npx tsx --env-file=.env src/db/seed.ts

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to the **company login screen**. Sign in with the master credentials (`admin` / `chimo-2026` by default).

> Seeding also happens automatically and idempotently on server boot
> (via `src/instrumentation.ts`).

### Seeded employee PINs (development)

| Employee (עובד)   | Role       | PIN  |
| ----------------- | ---------- | ---- |
| יוסי כהן          | Worker     | 1234 |
| דנה לוי           | Supervisor | 2468 |
| אבי מזרחי         | Worker     | 1379 |
| שרה אברהם         | Worker     | 4321 |
| מוחמד חלבי        | Worker     | 9876 |

Three formulas are seeded — each includes **timed steps** and **QC input steps** (mixture temperature, final pH measurement, lab approval note) so every feature is immediately testable.

## 4. Security Model (v2.0)

- **Level 1 — Company login:** a root middleware (`src/middleware.ts`) requires a valid signed `chimo_auth` cookie for every page/API route. Only `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/health` and static assets are public. Tokens are stateless HMAC-SHA256 (`chimo1.<scope>.<expiry>.<signature>`) verified via WebCrypto, so they work in the Edge runtime.
- **Level 2 — Formula Management gate (strict re-authentication):** full recipe details and all formula mutations additionally require the `chimo_formulas` cookie, obtained by re-entering the master company password. The cookie is a **browser-session cookie** (never written to disk) with a 15-minute hard cap — and the app actively revokes it via `POST /api/auth/formulas-lock` on **every** navigation away from the formulas section and before **every** click into it, so each visit prompts for the password from scratch and no reusable session ever survives. Enforced server-side by `requireFormulasAuth()` in every `/api/formulas*` GET/POST/PUT/DELETE route — the list endpoint only exposes safe summaries (needed by floor workers to pick a formula).
- **Level 3 — Employee PIN:** every batch creation requires an employee's personal 4-digit PIN, stored as salted scrypt hashes (`src/lib/pin.ts`).
- **Troubleshooting tip:** health probes (`GET /api/health`) always remain public for platform monitoring.

## 5. Production Build & Start

```bash
npm run build
npm run start
```

Health endpoint: `GET /api/health → { "ok": true, "service": "chimo", "db": "up" }`

## 6. Deploying to Production

Chimo is a standard Next.js application — deploy to any Node.js-capable platform.

```dockerfile
# Minimal container outline
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

1. Provision PostgreSQL and set `DATABASE_URL`.
2. **Set `CHIMO_ADMIN_PASSWORD` and `CHIMO_SESSION_SECRET` to strong production values** (and optionally `CHIMO_ADMIN_USER`).
3. Run `npx drizzle-kit push` once against the production database.
4. Deploy — first boot auto-seeds empty databases idempotently.

Cookies are set with `httpOnly + SameSite=Lax` and `Secure` in production, so serve the app over HTTPS.

## 7. Useful Scripts & Quality Gates

```bash
npm run dev         # Development server
npm run build       # Production build
npm run start       # Production server
npm run typecheck   # Strict TypeScript check (tsc --noEmit)
npm run lint        # ESLint
npx drizzle-kit push              # Apply schema to the database
npx tsx --env-file=.env src/db/seed.ts   # Manual (idempotent) seed
```

## 8. Architecture Notes

- `src/db/schema.ts` — employees, formulas, formula steps (with `step_type` = `timed` | `input` + QC configuration), formula ingredients, batches, batch steps (with the recorded `input_value`).
- **Timer durability** — step timers derive from server timestamps (`startedAt` + accumulated `elapsedMs`); the client computes its server offset from every payload's `serverTime` and renders countdowns against it. Refreshing or closing the tab never resets a timer.
- **Strict gating** — `POST /api/batches/:id/advance` recomputes remaining time on the server (timed steps) or validates & stores the worker's measurement (input steps, with numeric range enforcement in both client and server).
- **Manual start** — batches are created with all steps `pending`; `POST /api/batches/:id/start` is the explicit Step-1 trigger.
- **Global audio** — the chime is a synthesized 3-second WAV (no binary asset) played through an HTML `<audio>` element owned by a layout-level provider. `<GlobalTimerMonitor />` is mounted once inside the AppShell, so it lives on **every page** (dashboard, history, employees, formulas…); it polls the shared dashboard feed, evaluates every active step against server-synced time, and fires the alert the instant any timer reaches zero. Each step is announced once and the player refuses overlapping playback.
- **Auth scope enforcement** — see section 4.

## 9. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Redirected to `/login` after every sign-in | Cookie blocked — serve over HTTPS, or verify `CHIMO_SESSION_SECRET` is stable between restarts |
| `403 נדרש אימות מנהל` when saving a formula | The formulas session expired (1 hour) — re-enter the company password |
| `DATABASE_URL is required` on boot | `.env` missing or variable not exported in the deployment platform |
| `relation "employees" does not exist` | Run `npx drizzle-kit push` against the target database |
| Employee PIN always rejected | Employees were seeded with plain-text expectations — PINs are scrypt-hashed; add the employee via the UI instead |
