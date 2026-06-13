# Frontend Progress Tracker

_Last updated: 2026-06-13_

Stack: React 18 · TypeScript · Vite 6 · Tailwind · shadcn-style UI · React Router 6 ·
TanStack Query · Axios · React Hook Form · Zod · Lucide · Recharts · Sonner.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Setup · Routing · Layout · Authentication | ✅ Complete (build green) |
| 2 | Dashboard · Products | ✅ Complete (build green) |
| 3 | Sales Orders | ✅ Complete (build green) |
| 4 | Manufacturing (Kanban + detail) · BoMs | ⏳ Pending approval |
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

## Phase 2 — Completed

**Reusable building blocks (used by all later phases)**
* `components/common/KpiCard` — dashboard KPI tile.
* `components/tables/DataTable` — generic table with built-in loading skeleton,
  error + retry, and empty states (typed `Column<T>` API).
* `components/common/Badge` — semantic pill (neutral/primary/success/warning/danger/info).
* `components/common/StateViews` — `LoadingState` / `ErrorState` / `EmptyState`.
* `components/common/SectionCard` — titled white panel.
* `utils/format` (number/currency/percent/date/relative), `utils/movements`
  (movement label/icon/tone + reference tags), `hooks/useDebouncedValue`.

**Dashboard (Screen 1)** — `features/dashboard/`
* 5 live KPI cards: Total Products, Pending Sales, Pending POs, Active MOs,
  Inventory Health (derived = non-low / total products).
* `ManufacturingChart` — MO-by-status bar chart (Recharts) from manufacturing-stats.
* `InventoryValueChart` — top products by on-hand stock value (from /products).
* `LowStockPanel` — live low-stock table with severity styling.
* `RecentActivityPanel` — traceability feed built from the inventory movement
  ledger, mapped to source document (SO/PO/MO) and product name.
* Each panel owns independent loading/error/empty states.

**Products (Screen 3)** — `features/products/`
* `ProductsPage` — debounced **server-side search** (`/products?search=`),
  stock-status legend, live count.
* `ProductsTable` — built on `DataTable`; ref, name+cost, on-hand w/ status dot,
  free-to-use, procurement badge (+ on-demand flag), unit price, row/edit actions.
* `ProductDrawer` — create + edit + delete in a slide-over (RHF + Zod). Edit shows
  read-only On Hand / Reserved / Free (stock is flow-controlled per backend);
  delete handles the 409 "still has stock" rule via toast.
* Mutations invalidate the products query; Sonner toasts on success/error.

## Backend endpoints integrated (Phase 2)
* `GET /dashboard/inventory-summary`
* `GET /dashboard/low-stock`
* `GET /dashboard/pending-sales`
* `GET /dashboard/pending-purchases`
* `GET /dashboard/pending-manufacturing`
* `GET /dashboard/manufacturing-stats`
* `GET /inventory/movements` (recent activity feed)
* `GET /products` · `POST /products` · `PATCH /products/{id}` · `DELETE /products/{id}`

## Design adaptations (data-driven, layout preserved)
* Dashboard main chart: design's mock "Manufacturing Performance" line (no time-series
  endpoint exists) → **MO-by-status** bar chart. Same card/layout.
* Dashboard secondary chart: "Inventory Value by Category" (no category field on
  Product) → **Top Products by Stock Value**. Same card/layout.
* "Recent Activity" wired to the real inventory-movement ledger (reinforces the
  traceability story) instead of a non-existent events endpoint.
* Products "SKU" column → "Ref" (`#id`); "Forecasted" → "Free to Use"
  (`free_to_use_qty`), matching the backend's stock model.

## Phase 3 — Completed

**New shared building blocks**
* `components/common/Modal` — backdrop + Esc-to-close dialog (reused for deliver,
  confirm-result, cancel).
* `components/common/StatusBadge` — renders a `StatusMeta` ({label, tone, icon});
  per-domain maps supply the data (Sales map shipped; PO/MO maps come in Phase 4).

**Sales feature** — `features/sales/`
* `SalesOrdersPage` — status filter chips, `DataTable` list (ref, customer,
  date, line count, status badge, total), row → detail.
* `CreateSalesOrderDrawer` — RHF + Zod customer fields + `SalesLineEditor`;
  live estimated total; on success navigates to the new order.
* `SalesLineEditor` (reusable) — product picker with auto price fill, qty/price,
  per-line **availability + procurement-intent badge** (in stock / auto-procure /
  reserve-partial) so users see what confirm will do before submitting.
* `SalesOrderDetailPage` — document card, `OrderLifecycle` timeline
  (Draft→Confirmed→Delivering→Delivered, cancelled state), reservation banner,
  line table with ordered/delivered/remaining, totals, and status-aware actions.
* `OrderLifecycle` — progress tracker driven by real status.
* **Confirm flow** → `ConfirmationResultDialog` surfaces backend `messages` and
  the auto-generated **PO/MO chips** (links to /purchase, /manufacturing).
* **Deliver flow** → `DeliverDialog` with per-line remaining quantities and a
  "Deliver all remaining" shortcut (empty body); client guards for nicer UX but
  backend remains source of truth.
* **Cancel flow** → confirmation modal; notes that auto-generated PO/MO are not
  unwound (per backend `progress.md`).

**Data integrity**
* Mutations invalidate `sales-orders`, `products`, and `dashboard` queries so
  stock/KPIs stay consistent after confirm/deliver/cancel.
* No optimistic updates on state transitions — they trigger backend side effects
  (reservation, procurement); we use the server's authoritative returned state
  instead. (Optimistic UI applied only where truly safe = none here.)
* Backend business-rule errors (e.g. illegal transition, over-deliver) are always
  surfaced via toast, never suppressed.

## Backend endpoints integrated (Phase 3)
* `GET /sales-orders` (+ `?status_filter=`)
* `GET /sales-orders/{id}`
* `POST /sales-orders`
* `POST /sales-orders/{id}/confirm`
* `POST /sales-orders/{id}/deliver`
* `POST /sales-orders/{id}/cancel`

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
