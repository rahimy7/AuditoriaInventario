# InventControl

Mobile inventory counting app for Android and iOS with role-based access for Auxiliar (counter), Supervisor, and Gerente (manager).

## Run & Operate

- `pnpm --filter @workspace/web run dev` — run the web management console (Vite; honors `PORT`, default 5173)
- `pnpm --filter @workspace/web run build` — production build of the web console
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000). On start it **auto-creates its schema and seeds demo data** if the DB is empty (see `src/lib/bootstrap.ts`).
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string. Locally, put it in `artifacts/api-server/.env` (gitignored; see `.env.example`); on Replit set it as a Secret. TLS is auto-enabled for hosted hosts (Neon/Replit/Supabase/AWS).
- Web ↔ API wiring: set `VITE_API_URL` (e.g. `http://localhost:5000/api`) for the web console to use the backend ("online" mode). If unset/unreachable it runs "offline" on localStorage seed data. See `artifacts/web/.env.example`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo ~54, expo-router ~6, AsyncStorage 2.2.0

## Where things live

- `artifacts/web/` — React + Vite + Tailwind v4 (shadcn) web management console. Same 3-role capabilities as mobile **plus** desktop management: full audit lifecycle controls, user CRUD, product-catalog CRUD, bulk item reassignment, richer metrics/charts (recharts), activity log, and CSV export. `src/data/api.ts` is the REST client; `src/data/store.tsx` picks a provider at startup — **`ApiStoreProvider`** (online: hydrates from `GET /api/state`, mutations hit the API and re-hydrate) or **`LocalStoreProvider`** (offline: localStorage seed, same reducers as the demo). Routes in `src/pages/`, role-aware shell in `src/components/layout/AppShell.tsx`, routing/guards in `src/App.tsx` (wouter). Demo logins identical to mobile.
- `lib/db/src/schema/` — Drizzle tables: `users`, `products`, `audits` (assigned_to/lines/categories as `text[]`), `count_items` (FK → audits cascade, → products restrict), `activity_log`. Enums (roles/statuses) are TS unions in `enums.ts`.
- `artifacts/api-server/src/routes/` — REST API under `/api`: `auth/login`, `state` (full hydrate), `users`, `products`, `audits` (+ `/status`, `/assign`, `/close`, `/approve-all`, `/items`), `count-items` (PATCH save, `/submit`, `/review`, `/reassign`, `/submit-all`, DELETE), `activity`. `src/lib/`: `bootstrap` (DDL+seed), `service` (progress recompute, activity log, item↔product join), `dto` (row→DTO). Auth is a lightweight `Authorization: Bearer <userId>` token used to attribute activity.
- `artifacts/mobile/` — Expo React Native app (the main product)
- `artifacts/mobile/app/` — expo-router file-based routes
- `artifacts/mobile/contexts/` — AuthContext (mock auth, 3 roles) + AuditContext (CRUD + AsyncStorage)
- `artifacts/mobile/components/` — StatusBadge, AuditCard, MetricCard, ErrorBoundary
- `artifacts/mobile/constants/colors.ts` — corporate blue theme
- `artifacts/mobile/hooks/useColors.ts` — theme hook

## Architecture decisions

- **Backend (web):** the web console is wired to a real Postgres-backed API (`artifacts/api-server` + `lib/db`, Drizzle). The server self-provisions (idempotent DDL + seed on empty DB), so a fresh `DATABASE_URL` is enough. The web app degrades gracefully to offline localStorage mode when the API is unreachable.
- **Mobile still uses AsyncStorage** (mock seed) and is not yet wired to the API — that's the remaining follow-up to make web+mobile share data. Its `AuthContext`/`AuditContext` are unchanged.
- Data shape is shared across mobile/web/API (User, Product, Audit, CountItem, Activity) so the mobile client can adopt the same `api.ts` pattern later.
- Role-based tabs: Auxiliar sees Dashboard+Pool; Supervisor adds Review; Gerente adds Metrics+Users.
- Barcode scanner is simulated (no expo-camera) — manual text input + pre-filled demo chips.
- All screens are stack-based (expo-router Stack), tabs are nested inside `(tabs)`.
- Corporate blue: primary `#1565C0`, dark `#0D47A1`.

## Product

Three-role inventory counting system:
- **Auxiliar**: scans products in assigned audits, enters quantities, attaches photo evidence, adds notes.
- **Supervisor**: assigns workers to audits, reviews counted items, approves or returns for correction.
- **Gerente**: creates audits, views metrics dashboards (general/users/diff), manages users.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Workflow name is `artifacts/mobile: expo` (use this with restart_workflow).
- Demo credentials: auxiliar@inv.com | supervisor@inv.com | gerente@inv.com — all password `1234`.
- `app/_layout.tsx` wraps the entire tree in: SafeAreaProvider → ErrorBoundary → QueryClientProvider → AuthProvider → AuditProvider → GestureHandlerRootView → KeyboardProvider.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific guidance
