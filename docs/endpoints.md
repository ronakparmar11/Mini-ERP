# Endpoint Documentation

Base URL: `http://localhost:8000`
API prefix: `/api/v1` (all endpoints below are relative to this prefix unless noted).

**Auth**: send the JWT in the `Authorization: Bearer <token>` header on every
protected endpoint.

**Standard error envelope** (all errors):
```json
{ "error": { "code": "business_rule_violation", "message": "human readable reason" } }
```

Common status codes used across the API:
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (deletes) |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but missing required permission |
| 404 | Resource not found |
| 409 | Business rule violation (e.g. illegal status transition, insufficient stock) |
| 422 | Request body/validation error |

---

## Authentication

### POST /auth/login
**Module:** Authentication · **Authorization:** Public
Authenticate user and return a JWT.

Request Body:
```json
{ "email": "admin@example.com", "password": "admin123" }
```
Success Response — 200:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "role": "ADMIN" }
```
Errors: 401 (invalid credentials / disabled), 422 (validation).
**Frontend note:** store the token; decode/keep `role` to toggle UI. Token TTL defaults to 8h.

### POST /auth/token
**Module:** Authentication · **Authorization:** Public · _(hidden from schema)_
OAuth2 password-form variant used by Swagger's **Authorize** button. Field `username` carries the email. Same response as `/auth/login`.

### GET /auth/me
**Module:** Authentication · **Authorization:** Any authenticated user
Returns the current user profile.
Success — 200: `UserOut` (see Users).

---

## Users  _(admin-only: `users:manage`)_

### GET /users
List all users. → 200 `[UserOut]`

### POST /users
Create a user.
Request Body:
```json
{ "name": "Jane", "email": "jane@example.com", "password": "secret123",
  "role": "SYSTEM_USER", "is_active": true }
```
Success — 201 `UserOut`. Errors: 409 (email exists), 422.

### GET /users/{user_id}
→ 200 `UserOut` · 404 if missing.

### PATCH /users/{user_id}
Partial update (any subset of `name`, `password`, `role`, `is_active`). → 200 `UserOut`.

**UserOut**:
```json
{ "id": 1, "name": "Admin", "email": "admin@example.com",
  "role": "ADMIN", "is_active": true, "created_at": "2026-06-13T10:00:00Z" }
```

---

## Products

| Method | URL | Permission |
|--------|-----|------------|
| GET | /products?search= | products:view |
| POST | /products | products:create |
| GET | /products/{id} | products:view |
| PATCH | /products/{id} | products:edit |
| DELETE | /products/{id} | products:delete |

POST /products — Request Body:
```json
{ "name": "Wooden Table", "sales_price": 120, "cost_price": 40,
  "on_hand_qty": 5, "procure_on_demand": true,
  "procurement_method": "MANUFACTURE", "vendor_id": null }
```
**ProductOut** (success 200/201):
```json
{ "id": 3, "name": "Wooden Table", "sales_price": 120.0, "cost_price": 40.0,
  "on_hand_qty": 5.0, "reserved_qty": 0.0, "free_to_use_qty": 5.0,
  "procure_on_demand": true, "procurement_method": "MANUFACTURE",
  "vendor_id": null, "created_at": "2026-06-13T10:00:00Z" }
```
Notes for frontend:
* `free_to_use_qty = on_hand_qty - reserved_qty` is computed server-side.
* Stock quantities are **read-only** here; they change only via sales/purchase/manufacturing flows.
* DELETE returns **204**; blocked with **409** if the product still has stock/reservations.
* `procurement_method` ∈ `PURCHASE | MANUFACTURE`.

---

## Sales Orders

| Method | URL | Permission |
|--------|-----|------------|
| GET | /sales-orders?status_filter= | sales:view |
| POST | /sales-orders | sales:create |
| GET | /sales-orders/{id} | sales:view |
| POST | /sales-orders/{id}/confirm | sales:confirm |
| POST | /sales-orders/{id}/deliver | sales:edit |
| POST | /sales-orders/{id}/cancel | sales:delete |

### POST /sales-orders
```json
{ "customer_name": "Bob Corp", "customer_address": "12 Main St",
  "salesperson": "Alice",
  "lines": [ { "product_id": 3, "ordered_quantity": 10, "sales_price": 120 } ] }
```
`sales_price` optional — defaults to the product's price. → 201 **SalesOrderOut**.

**SalesOrderOut**:
```json
{ "id": 1, "customer_name": "Bob Corp", "customer_address": "12 Main St",
  "salesperson": "Alice", "creation_date": "2026-06-13T10:00:00Z",
  "status": "DRAFT", "total_amount": 1200.0,
  "lines": [ { "id": 1, "product_id": 3, "ordered_quantity": 10.0,
              "delivered_quantity": 0.0, "sales_price": 120.0,
              "total": 1200.0, "remaining_to_deliver": 10.0 } ] }
```

### POST /sales-orders/{id}/confirm
Reserves available stock and auto-triggers procurement for shortages.
Success — 200 **ConfirmationResult**:
```json
{ "sales_order": { ...SalesOrderOut, "status": "CONFIRMED" },
  "generated_purchase_order_ids": [5],
  "generated_manufacturing_order_ids": [],
  "messages": [ "Reserved 2 of 'Wooden Table'.",
                "Auto-created Purchase Order #5 (Acme Supplies) for shortage." ] }
```
Errors: 409 (not DRAFT), 404. **Frontend note:** show `messages` to the user; link the generated PO/MO ids.

### POST /sales-orders/{id}/deliver
Body (optional — omit to deliver everything remaining):
```json
{ "lines": [ { "line_id": 1, "quantity": 4 } ] }
```
→ 200 SalesOrderOut. Status becomes `PARTIALLY_DELIVERED` or `DELIVERED`.
Errors: 409 (not CONFIRMED/PARTIALLY_DELIVERED, or quantity exceeds remaining).

### POST /sales-orders/{id}/cancel
→ 200 SalesOrderOut (`CANCELLED`); releases outstanding reservations. 409 if already DELIVERED/CANCELLED.

Status values: `DRAFT, CONFIRMED, PARTIALLY_DELIVERED, DELIVERED, CANCELLED`.

---

## Purchase Orders

| Method | URL | Permission |
|--------|-----|------------|
| GET | /purchase-orders?status_filter= | purchase:view |
| POST | /purchase-orders | purchase:create |
| GET | /purchase-orders/{id} | purchase:view |
| POST | /purchase-orders/{id}/confirm | purchase:confirm |
| POST | /purchase-orders/{id}/receive | purchase:edit |
| POST | /purchase-orders/{id}/cancel | purchase:delete |

### POST /purchase-orders
```json
{ "vendor": "Acme Supplies", "responsible_person": "Alice",
  "lines": [ { "product_id": 1, "ordered_quantity": 50, "cost_price": 5 } ] }
```
`cost_price` optional (defaults to product cost). → 201 **PurchaseOrderOut**.

**PurchaseOrderOut**:
```json
{ "id": 5, "vendor": "Acme Supplies", "responsible_person": "Alice",
  "creation_date": "2026-06-13T10:00:00Z", "status": "DRAFT",
  "source_sales_order_id": null, "total_amount": 250.0,
  "lines": [ { "id": 1, "product_id": 1, "ordered_quantity": 50.0,
              "received_quantity": 0.0, "cost_price": 5.0, "total": 250.0,
              "remaining_to_receive": 50.0 } ] }
```

### POST /purchase-orders/{id}/receive
Increases `on_hand`. Body optional (omit = receive all remaining):
```json
{ "lines": [ { "line_id": 1, "quantity": 20 } ] }
```
→ 200 PurchaseOrderOut. Status → `PARTIALLY_RECEIVED` or `RECEIVED`.
Errors: 409 (not CONFIRMED/PARTIALLY_RECEIVED, or over-receive).

Status values: `DRAFT, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED`.

---

## Bills of Materials  _(reuses manufacturing permissions)_

| Method | URL | Permission |
|--------|-----|------------|
| GET | /boms?finished_product_id= | manufacturing:view |
| POST | /boms | manufacturing:create |
| GET | /boms/{id} | manufacturing:view |
| DELETE | /boms/{id} | manufacturing:delete |

### POST /boms
```json
{ "finished_product_id": 3, "quantity": 1,
  "components": [ { "component_product_id": 1, "quantity_required": 4 },
                  { "component_product_id": 2, "quantity_required": 1 } ],
  "operations": [ { "work_center": "Assembly", "expected_duration": 30 } ] }
```
→ 201 **BoMOut**:
```json
{ "id": 1, "finished_product_id": 3, "quantity": 1.0,
  "created_at": "2026-06-13T10:00:00Z",
  "components": [ { "id": 1, "component_product_id": 1, "quantity_required": 4.0 } ],
  "operations": [ { "id": 1, "work_center": "Assembly", "expected_duration": 30.0 } ] }
```
Errors: 404 (product/component missing), 409 (product is its own component).
`quantity` = reference batch size; component quantities are "per batch".

---

## Manufacturing Orders

| Method | URL | Permission |
|--------|-----|------------|
| GET | /manufacturing-orders?status_filter= | manufacturing:view |
| POST | /manufacturing-orders | manufacturing:create |
| GET | /manufacturing-orders/{id} | manufacturing:view |
| POST | /manufacturing-orders/{id}/confirm | manufacturing:edit |
| POST | /manufacturing-orders/{id}/start | manufacturing:edit |
| POST | /manufacturing-orders/{id}/produce | manufacturing:produce |
| POST | /manufacturing-orders/{id}/cancel | manufacturing:delete |

### POST /manufacturing-orders
```json
{ "bom_id": 1, "quantity_to_produce": 5, "assignee": "Carol",
  "schedule_date": "2026-06-14T09:00:00Z" }
```
Explodes the BoM, scaling component/operation quantities by
`quantity_to_produce / bom.quantity`. → 201 **ManufacturingOrderOut**:
```json
{ "id": 1, "finished_product_id": 3, "bom_id": 1, "quantity_to_produce": 5.0,
  "assignee": "Carol", "schedule_date": "2026-06-14T09:00:00Z",
  "creation_date": "2026-06-13T10:00:00Z", "status": "DRAFT",
  "source_sales_order_id": null,
  "components": [ { "id": 1, "component_product_id": 1,
                   "quantity_required": 20.0, "quantity_consumed": 0.0 } ],
  "operations": [ { "id": 1, "work_center": "Assembly",
                   "expected_duration": 150.0, "actual_duration": null } ] }
```

### Lifecycle: confirm → start → produce
* **confirm**: DRAFT → CONFIRMED.
* **start**: CONFIRMED → IN_PROGRESS.
* **produce**: IN_PROGRESS → DONE. Consumes components (on_hand −=), produces
  finished good (on_hand +=), records durations. Body optional:
```json
{ "operations": [ { "operation_id": 1, "actual_duration": 145 } ] }
```
Errors: 409 (wrong status), 409 `insufficient_stock` (rolls back entirely).

Status values: `DRAFT, CONFIRMED, IN_PROGRESS, DONE, CANCELLED`.

---

## Inventory

### GET /inventory/movements?product_id=&limit=
**Permission:** products:view
Immutable stock ledger (newest first). → 200 `[InventoryMovementOut]`:
```json
[ { "id": 10, "product_id": 1, "quantity": 20.0,
    "movement_type": "PURCHASE_RECEIPT", "reference_type": "PURCHASE_ORDER",
    "reference_id": 5, "user_id": 1, "timestamp": "2026-06-13T10:05:00Z" } ]
```
`movement_type` ∈ `SALE_RESERVATION, SALE_DELIVERY, PURCHASE_RECEIPT, MO_CONSUMPTION, MO_PRODUCTION`.
**Frontend note:** filter by `product_id` to render a product's full trace.

---

## Audit Logs

### GET /audit-logs?module=&record_id=&limit=
**Permission:** audit:view (admin by default)
→ 200 `[AuditLogOut]`:
```json
[ { "id": 7, "module": "PRODUCT", "record_type": "Product", "record_id": 3,
    "field_name": "sales_price", "old_value": "100.0", "new_value": "120.0",
    "user_id": 1, "timestamp": "2026-06-13T10:10:00Z" } ]
```
`module` ∈ `PRODUCT, SALES_ORDER, PURCHASE_ORDER, MANUFACTURING_ORDER, BOM`.

---

## Dashboard

All read-only aggregates.

| Method | URL | Permission | Returns |
|--------|-----|------------|---------|
| GET | /dashboard/low-stock?threshold= | products:view | `[LowStockProduct]` |
| GET | /dashboard/pending-sales | sales:view | `[PendingOrderSummary]` |
| GET | /dashboard/pending-purchases | purchase:view | `[PendingOrderSummary]` |
| GET | /dashboard/pending-manufacturing | manufacturing:view | `[PendingOrderSummary]` |
| GET | /dashboard/manufacturing-stats | manufacturing:view | `ManufacturingStats` |
| GET | /dashboard/inventory-summary | products:view | `InventorySummary` |

Examples:
```json
// LowStockProduct
{ "product_id": 1, "name": "Wood Plank", "on_hand_qty": 3.0,
  "reserved_qty": 0.0, "free_to_use_qty": 3.0 }

// PendingOrderSummary
{ "id": 1, "reference": "SO-1 Bob Corp", "status": "CONFIRMED", "total_amount": 1200.0 }

// ManufacturingStats
{ "total": 10, "draft": 2, "confirmed": 1, "in_progress": 1,
  "done": 5, "cancelled": 1, "completion_rate": 0.5 }

// InventorySummary
{ "total_products": 3, "total_on_hand": 107.0, "total_reserved": 2.0,
  "total_free_to_use": 105.0, "total_stock_value_at_cost": 1080.0 }
```

---

## Health
### GET /health  _(no prefix, public)_
→ 200 `{ "status": "ok", "app": "Mini ERP" }`

---

## Seeded credentials (dev)
| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| user@example.com | user123 | SYSTEM_USER |
