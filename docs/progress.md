# Project Progress Tracker

_Last updated: 2026-06-13_

## Completed

* [x] Project scaffolding & clean-architecture folder structure
* [x] Core infrastructure (config, enums, exceptions, JWT/bcrypt security)
* [x] Database layer (declarative Base, session factory, `unit_of_work` transactions)
* [x] SQLAlchemy models (User, Product, Sales, Purchase, BoM, Manufacturing, Inventory, Audit)
* [x] Pydantic v2 schemas for every module
* [x] JWT Authentication (login + OAuth2 form for Swagger)
* [x] RBAC dependencies (`require(*perms)`, ADMIN superuser, SYSTEM_USER grant map)
* [x] Product CRUD APIs (with audit logging)
* [x] User administration APIs (admin-only)
* [x] Inventory service — single source of truth for stock + immutable movement ledger
* [x] Audit service — field-level change diffing
* [x] Sales Order creation
* [x] Sales confirmation logic (reservation math)
* [x] Procurement automation (auto Purchase Order + auto Manufacturing Order on shortage)
* [x] Sales delivery (partial + full, status transitions)
* [x] Purchase Order creation + confirm
* [x] Purchase receipt workflow (partial + full receipts)
* [x] Bill of Materials CRUD (components + operations)
* [x] Manufacturing Order from BoM (explosion + scaling)
* [x] Manufacturing production workflow (consume components, produce finished good, actual durations)
* [x] Inventory movement ledger + read API
* [x] Audit logging (Products, Sales, Purchase, Manufacturing, BoM)
* [x] Dashboard endpoints (low stock, pending SO/PO/MO, MO stats, inventory summary)
* [x] Centralized exception-handling middleware
* [x] Alembic migration scaffold (env.py wired to settings + models metadata)
* [x] Seed script (admin + sample products + BoM)
* [x] Unit/integration test suite — **11 scenarios passing** (verified on SQLite)

## In Progress

* Nothing actively in progress — MVP backend feature-complete.

## Pending (post-MVP enhancements)

* [ ] Generate the first real Alembic revision against a live Postgres instance
* [ ] Release reserved stock automatically when an auto-created PO/MO is cancelled
* [ ] Pagination on list endpoints (currently capped lists)
* [ ] Per-user (not just per-role) permission overrides
* [ ] Soft-delete instead of hard-delete for products
* [ ] Backorder handling / re-run reservation when procured stock arrives
* [ ] Rate limiting + refresh tokens
* [ ] Dockerfile + docker-compose (Postgres + API)

## Known Issues

* **Reservation release on cancel**: `SalesService.cancel` releases reservations
  best-effort but does not unwind an already-created PO/MO. Workaround: cancel the
  generated PO/MO manually.
* **`with_for_update` no-op on SQLite**: row-level locking only takes effect on
  PostgreSQL. Tests therefore validate logic, not concurrency. Acceptable for MVP.
* **passlib removed**: switched to the `bcrypt` library directly because passlib
  1.7.4 is incompatible with bcrypt 4.x. Passwords are truncated to 72 bytes
  (bcrypt limit) — standard practice.
* **Enums stored as VARCHAR** via SQLAlchemy `Enum` (not native PG ENUM) to keep
  hackathon migrations simple. Fine for production; switch to native enums later
  if strict DB-level constraints are required.

## Decisions Taken

* **Layered clean architecture** (routes → services → models). All ERP business
  logic lives in services; routes are thin HTTP adapters.
* **Service layer owns transactions** via `unit_of_work`; multi-step flows (e.g.
  confirm = reserve + create PO/MO + audit + movement) are atomic.
* **Inventory is mutated ONLY through `InventoryService.apply_movement`**, which
  enforces non-negative stock and writes a movement row — guaranteeing 100%
  traceability with no bypass path.
* **Audit via snapshot diffing** — one row per changed field, written in the same
  transaction as the mutation so logs never drift from data.
* **RBAC as composable dependencies** — `require(P.SALES_CONFIRM)`; ADMIN is a
  superuser, SYSTEM_USER uses an editable permission grant set.
* **Numeric (not float) columns** for money/quantities to avoid rounding errors.
* **Procurement consolidation** — purchase shortages are grouped by vendor into a
  single draft PO per vendor per confirmation.
