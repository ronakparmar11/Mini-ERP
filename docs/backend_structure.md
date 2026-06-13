# Backend Structure & Architecture

## 1. Folder structure

```
backend/
├── main.py                  # FastAPI app factory, CORS, error handlers, router mount
├── requirements.txt
├── .env.example             # copy to .env
├── alembic.ini              # Alembic config (URL injected from settings)
│
├── database/
│   ├── base.py              # Declarative Base + constraint naming convention + TimestampMixin
│   └── session.py           # engine, SessionLocal, get_db (request dep), unit_of_work (txn)
│
├── utils/
│   ├── config.py            # pydantic-settings Settings (env-driven)
│   ├── enums.py             # Role, statuses, MovementType, ReferenceType, AuditModule, ...
│   ├── exceptions.py        # ERPException hierarchy (status_code + code)
│   └── security.py          # bcrypt hashing + JWT encode/decode
│
├── models/                  # SQLAlchemy ORM (persistence + relationships only)
│   ├── __init__.py          # imports all models so Base.metadata is complete
│   ├── user.py product.py sales.py purchase.py
│   ├── bom.py manufacturing.py inventory.py audit.py
│
├── schemas/                 # Pydantic v2 request/response models (the API contract)
│   └── auth user product sales purchase bom manufacturing inventory audit dashboard
│
├── dependencies/
│   ├── permissions.py       # P.* permission constants + role→permission map
│   └── auth.py              # get_current_user, require(*perms)
│
├── services/                # ALL business logic lives here
│   ├── inventory_service.py # sole mutator of stock + movement ledger
│   ├── audit_service.py     # field-level change diffing
│   ├── auth_service.py user_service.py product_service.py
│   ├── sales_service.py purchase_service.py
│   ├── bom_service.py manufacturing_service.py dashboard_service.py
│
├── routes/                  # Thin HTTP adapters (parse → authorize → call service → serialize)
│   ├── __init__.py          # api_router aggregates every module router
│   └── auth users products sales purchase bom manufacturing inventory audit dashboard
│
├── middleware/
│   └── error_handler.py     # maps ERPException → JSON HTTP responses
│
├── scripts/
│   └── seed.py              # admin user + sample products + BoM
│
├── migrations/              # Alembic (env.py wired to settings + models metadata)
│   ├── env.py  script.py.mako  versions/
│
└── tests/                   # pytest: conftest (SQLite) + test_workflows (11 scenarios)
```

## 2. Responsibility of each folder

| Folder | Responsibility | May depend on |
|--------|----------------|---------------|
| `routes/` | HTTP only: path/query/body parsing, auth dependency, response model | services, schemas, dependencies |
| `services/` | Business logic, transactions, orchestration | models, schemas, other services, database |
| `models/` | Table definitions + relationships + computed properties | database.base, utils.enums |
| `schemas/` | Validation + serialization contracts | utils.enums |
| `dependencies/` | Auth/RBAC FastAPI dependencies | models, utils.security |
| `database/` | Engine, session, transaction helpers | utils.config |
| `middleware/` | Cross-cutting request/response concerns | utils.exceptions |
| `utils/` | Config, enums, exceptions, security primitives | (leaf) |

**Dependency rule:** dependencies point inward. Routes depend on services;
services depend on models; nothing depends on routes. This keeps business logic
reusable from workers, CLIs and tests without HTTP.

## 3. Service layer philosophy

* A route should be readable in ~5 lines: resolve dependencies, call one service
  method, return. No business rules in routes.
* Each service is constructed with a `Session` (`SalesService(db)`), so it is
  trivially testable and composable. Services may instantiate sibling services
  (e.g. `SalesService` uses `InventoryService`, `PurchaseService`,
  `ManufacturingService`, `AuditService`).
* **Public vs internal methods:** public methods (e.g. `create`, `confirm`) own
  their own transaction via `unit_of_work`. Internal builders (e.g.
  `PurchaseService._build_order`, `ManufacturingService._build_from_bom`) do NOT
  commit — they flush within the *caller's* transaction so composite workflows
  (sales confirmation creating a PO/MO) commit atomically as one unit.

## 4. RBAC strategy

* Permissions are namespaced strings `"<module>:<action>"`, defined once in
  `dependencies/permissions.py` as `P.*` constants.
* `permissions_for_role(role)` returns the held set: `ADMIN` = all permissions
  (superuser); `SYSTEM_USER` = `DEFAULT_SYSTEM_USER_PERMISSIONS` (everything
  except `users:manage`). Tune the map in one place.
* Routes declare intent: `dependencies=[Depends(require(P.SALES_CONFIRM))]`.
  `require()` loads the JWT user, verifies the account is active, and checks the
  permission set, raising `PermissionDeniedError` (403) on a miss.
* JWT carries `sub` (user id) and `role`. The frontend can read `role` to gate
  UI, but the server is always the source of truth.
* **Extending to per-user permissions later:** add a `permissions` column/table
  and union it into `permissions_for_role`; no route changes needed.

## 5. Transaction handling strategy

* `get_db` yields a session but never commits — services decide.
* `unit_of_work(db)` is a context manager: commit on success, rollback on any
  exception, re-raise. Every state-changing service method wraps its work in it.
* **Atomicity guarantees that matter for an ERP:**
  * Sales confirmation: stock reservation + generated PO/MO + audit rows +
    movement rows all commit together, or none do.
  * Manufacturing production: if *any* component is short, the whole production
    rolls back — no partial consumption, no half-built finished goods.
* **Concurrency:** `InventoryService` loads products `with_for_update()` (row
  lock) so two simultaneous deliveries can't both read the same `on_hand` and
  oversell. This is a no-op on SQLite (tests) but enforced on PostgreSQL.

## 6. Inventory flow philosophy

Inventory is the heart of the ERP and has exactly **one** mutation path:
`InventoryService.apply_movement(...)`. It (1) validates the resulting
`on_hand`/`reserved` stay non-negative, (2) updates the product counters, and
(3) appends an immutable `InventoryMovement` row. No other code touches stock.

Stock semantics per event:

| Event | Movement type | on_hand | reserved |
|-------|---------------|---------|----------|
| Sales confirm (available) | SALE_RESERVATION | — | `+qty` |
| Sales deliver | SALE_DELIVERY | `−qty` | `−qty` |
| Purchase receipt | PURCHASE_RECEIPT | `+qty` | — |
| MO consumption | MO_CONSUMPTION | `−qty` | — |
| MO production | MO_PRODUCTION | `+qty` | — |

`free_to_use_qty = on_hand_qty − reserved_qty` (computed property, never stored).

**Procurement automation** (on sales confirm, per shortage line, when
`procure_on_demand`): `PURCHASE` → consolidate shortages by vendor into draft
Purchase Order(s); `MANUFACTURE` → explode the product's latest BoM into a draft
Manufacturing Order. Generated documents carry `source_sales_order_id` for
traceability.

Because every movement is an append-only ledger row, current `on_hand` for any
product can be reconstructed by replaying its movements — the audit-grade
property an ERP needs.

## 7. Audit logging approach

* `AuditService.log_changes(module, record_type, record_id, before, after, user)`
  diffs two dict snapshots and writes **one row per changed field**
  (`old_value`/`new_value` as strings).
* Called inside the same `unit_of_work` as the mutation → logs can never drift
  from the data they describe.
* Covered entities: Products, Sales Orders, Purchase Orders, Manufacturing
  Orders, BoMs. Status transitions and field edits are both captured.
* Query via `GET /audit-logs?module=&record_id=`.

## 8. Running it

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env                                 # set DATABASE_URL, JWT_SECRET_KEY

# Option A (hackathon quick start) — create tables + seed without Alembic:
python -m scripts.seed

# Option B (production) — use migrations (see Alembic strategy below):
alembic revision --autogenerate -m "init"
alembic upgrade head
python -m scripts.seed

uvicorn main:app --reload          # docs at http://localhost:8000/docs
pytest                             # 11 workflow scenarios (uses in-memory SQLite)
```

## 9. Alembic migration strategy

* `migrations/env.py` imports the `models` package (populating `Base.metadata`)
  and reads the DB URL from `settings`, so a single source of truth drives both
  the app and migrations.
* **Workflow:** change a model → `alembic revision --autogenerate -m "msg"` →
  review the generated script in `migrations/versions/` → `alembic upgrade head`.
* `compare_type=True` is enabled so column type changes are detected.
* The constraint **naming convention** in `database/base.py` ensures
  autogenerated index/constraint names are stable and reversible — review-friendly
  migrations rather than random hashes.
* For the hackathon you may bootstrap with `scripts.seed` (`create_all`) and add
  the first real migration once the schema settles; switch fully to Alembic before
  any production deployment so schema changes are versioned.

## 10. Notable engineering decisions

* `from __future__ import annotations` in service modules — defers annotation
  evaluation so a method named `list` doesn't shadow the builtin `list[...]`
  generic at class-definition time. Also a small import-time speedup.
* `Numeric` columns (not `float`) for all money/quantity fields to avoid binary
  floating-point rounding errors in financial/stock math.
* `bcrypt` used directly instead of `passlib` (unmaintained; breaks on bcrypt 4.x).
* SQLAlchemy `Enum` stored as VARCHAR rather than native PG ENUM — simpler
  migrations for a 24h MVP, easily upgraded later.
