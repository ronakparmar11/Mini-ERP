# Frontend Progress Tracker

_Last updated: 2026-06-13_

Stack: React 18 · TypeScript · Vite 6 · Tailwind · shadcn-style UI · React Router 6 ·
TanStack Query · Axios · React Hook Form · Zod · Lucide · Recharts · Sonner.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Setup · Routing · Layout · Authentication | ✅ Complete (build green) |
| 2 | Dashboard · Products | ⏳ Pending approval |
| 3 | Sales Orders | ⏳ |
| 4 | Manufacturing (Kanban + detail) · BoMs | ⏳ |
| 5 | Inventory · Audit | ⏳ |

## Phase 1 — Completed

**Foundation**
* Vite + TS + Tailwind project; Stitch design tokens encoded in `tailwind.config.ts`
  (primary `#3525cd`, surfaces, Inter type scale, 260px sidebar / 64px header).
* Path alias `@/*` → `src/*`. Build = `tsc --noEmit && vite build` (passes clean).

**API layer**
* `api/axios.ts` — shared instance, JWT request interceptor, **central 401 handling**
  (clears token + redirects to /login once).
* `api/queryClient.ts` — TanStack Query defaults.
* `utils/apiError.ts` — normalizes the backend `{ error: { code, message } }` envelope.
* `utils/storage.ts` — single owner of the persisted token.

**Authentication (real endpoints)**
* `AuthContext` — boot-time token validation via `GET /auth/me`; `login()` calls
  `POST /auth/login`, persists token, hydrates user; `logout()` clears + redirects.
* `LoginForm` — React Hook Form + Zod, inline + server error display.
* `ProtectedRoute` — guests → /login (preserves intended path); shows spinner while
  auth state resolves.

**Layout shell (Screen-faithful)**
* `Sidebar` — brand block, solid-indigo New Record, 8 nav items (exact Stitch order),
  Settings/Support footer; active = soft indigo tint.
* `Topbar` — global search shell, notification/settings/help icons, user avatar menu
  with name/email/role + Sign out.
* `AppLayout` — fixed sidebar + topbar + scrollable routed content.

**Screens delivered**
* **Login (Screen 2)** — split-panel brand + form, high design fidelity.
* App routes for all 8 modules; not-yet-built modules render a labelled
  `PlaceholderPage` (no mock data) so navigation is fully verifiable now.

**Reusable primitives created**
* `ui/button` (cva variants), `ui/input`, `ui/label`, `ui/card`, `common/Spinner`,
  `common/PageHeader`, `common/ProtectedRoute`, `pages/PlaceholderPage`.

## Backend endpoints integrated (Phase 1)
* `POST /auth/login`
* `GET /auth/me`

## Known notes / deferred
* Global search, notifications, Settings/Support, Forgot password, New Record are
  UI shells only — wired in later phases.
* Token stored in `localStorage` (MVP). Refresh tokens are out of scope per backend
  `progress.md`.

## Conventions for later phases
* One `api/<module>.ts` per domain returning typed promises; `types/<module>.ts` for
  DTOs mirroring `endpoints.md`.
* Data fetching via TanStack Query hooks in `features/<module>/`.
* Reuse `PageHeader`, `Card`, `Button`, status-badge pattern (to be added Phase 2).
