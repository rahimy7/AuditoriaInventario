# InventControl

Mobile inventory counting app for Android and iOS with role-based access for Auxiliar (counter), Supervisor, and Gerente (manager).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo ~54, expo-router ~6, AsyncStorage 2.2.0

## Where things live

- `artifacts/mobile/` — Expo React Native app (the main product)
- `artifacts/mobile/app/` — expo-router file-based routes
- `artifacts/mobile/contexts/` — AuthContext (mock auth, 3 roles) + AuditContext (CRUD + AsyncStorage)
- `artifacts/mobile/components/` — StatusBadge, AuditCard, MetricCard, ErrorBoundary
- `artifacts/mobile/constants/colors.ts` — corporate blue theme
- `artifacts/mobile/hooks/useColors.ts` — theme hook

## Architecture decisions

- No backend for v1 — all data in AsyncStorage with mock seed data. AuthContext holds 3 demo users.
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
