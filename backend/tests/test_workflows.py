"""Important ERP workflow unit/integration test scenarios.

These cover the business-critical invariants that a 24h MVP must not break:
inventory math, reservation, procurement automation, receiving, production,
status transitions, audit logging, and RBAC.
"""
from services.inventory_service import InventoryService
from services.product_service import ProductService
from services.sales_service import SalesService
from services.purchase_service import PurchaseService
from services.bom_service import BoMService
from services.manufacturing_service import ManufacturingService
from schemas.product import ProductCreate
from schemas.sales import SalesOrderCreate, SalesOrderLineCreate, DeliveryRequest
from schemas.purchase import PurchaseOrderCreate, PurchaseOrderLineCreate, ReceiptRequest
from schemas.bom import BoMCreate, BoMComponentCreate, BoMOperationCreate
from schemas.manufacturing import ManufacturingOrderCreate, ProduceRequest
from utils.enums import (
    MovementType, ProcurementMethod, PurchaseOrderStatus, ReferenceType,
    SalesOrderStatus, ManufacturingOrderStatus,
)
from utils.exceptions import InsufficientStockError, BusinessRuleError
import pytest


def _product(db, uid, **kw):
    data = ProductCreate(**{"name": "P", "on_hand_qty": 0, **kw})
    return ProductService(db).create(data, user_id=uid)


# --- 1. free_to_use computation -------------------------------------------------
def test_free_to_use_qty(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=10)
    assert p.free_to_use_qty == 10
    InventoryService(db_session).reserve_for_sale(p.id, 3, so_id=1, user_id=admin_user.id)
    db_session.commit()
    db_session.refresh(p)
    assert p.free_to_use_qty == 7  # 10 on_hand - 3 reserved


# --- 2. Sales confirmation reserves available stock ----------------------------
def test_confirm_reserves_stock(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=10, sales_price=5)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=4)]),
        user_id=admin_user.id)
    result = SalesService(db_session).confirm(so.id, user_id=admin_user.id)
    db_session.refresh(p)
    assert result.sales_order.status == SalesOrderStatus.CONFIRMED
    assert p.reserved_qty == 4
    assert p.free_to_use_qty == 6


# --- 3. Procurement automation: shortage -> auto Purchase Order ----------------
def test_confirm_shortage_creates_purchase_order(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=2,
                 procure_on_demand=True, procurement_method=ProcurementMethod.PURCHASE,
                 cost_price=3)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=5)]),
        user_id=admin_user.id)
    result = SalesService(db_session).confirm(so.id, user_id=admin_user.id)
    assert len(result.generated_purchase_order_ids) == 1
    po = PurchaseService(db_session).get(result.generated_purchase_order_ids[0])
    # Shortage = 5 ordered - 2 reservable = 3
    assert float(po.lines[0].ordered_quantity) == 3
    assert po.source_sales_order_id == so.id


# --- 4. Procurement automation: shortage -> auto Manufacturing Order -----------
def test_confirm_shortage_creates_manufacturing_order(db_session, admin_user):
    comp = _product(db_session, admin_user.id, on_hand_qty=100)
    fin = _product(db_session, admin_user.id, on_hand_qty=0,
                   procure_on_demand=True,
                   procurement_method=ProcurementMethod.MANUFACTURE)
    BoMService(db_session).create(
        BoMCreate(finished_product_id=fin.id, quantity=1,
                  components=[BoMComponentCreate(component_product_id=comp.id,
                                                 quantity_required=2)]),
        user_id=admin_user.id)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=fin.id, ordered_quantity=3)]),
        user_id=admin_user.id)
    result = SalesService(db_session).confirm(so.id, user_id=admin_user.id)
    assert len(result.generated_manufacturing_order_ids) == 1
    mo = ManufacturingService(db_session).get(result.generated_manufacturing_order_ids[0])
    assert float(mo.quantity_to_produce) == 3
    # Components scaled: 2 per unit * 3 = 6
    assert float(mo.components[0].quantity_required) == 6


# --- 5. Delivery reduces reserved + on_hand, sets status -----------------------
def test_partial_then_full_delivery(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=10)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=10)]),
        user_id=admin_user.id)
    SalesService(db_session).confirm(so.id, user_id=admin_user.id)
    line_id = so.lines[0].id

    so = SalesService(db_session).deliver(
        so.id, DeliveryRequest(lines=[{"line_id": line_id, "quantity": 4}]),
        user_id=admin_user.id)
    db_session.refresh(p)
    assert so.status == SalesOrderStatus.PARTIALLY_DELIVERED
    assert p.on_hand_qty == 6 and p.reserved_qty == 6

    so = SalesService(db_session).deliver(so.id, DeliveryRequest(), user_id=admin_user.id)
    db_session.refresh(p)
    assert so.status == SalesOrderStatus.DELIVERED
    assert p.on_hand_qty == 0 and p.reserved_qty == 0


# --- 6. Purchase receipt increases on_hand (partial supported) ------------------
def test_purchase_partial_receipt(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=0, cost_price=3)
    po = PurchaseService(db_session).create(
        PurchaseOrderCreate(vendor="Acme",
                            lines=[PurchaseOrderLineCreate(product_id=p.id, ordered_quantity=10)]),
        user_id=admin_user.id)
    PurchaseService(db_session).confirm(po.id, user_id=admin_user.id)
    line_id = po.lines[0].id

    po = PurchaseService(db_session).receive(
        po.id, ReceiptRequest(lines=[{"line_id": line_id, "quantity": 4}]),
        user_id=admin_user.id)
    db_session.refresh(p)
    assert po.status == PurchaseOrderStatus.PARTIALLY_RECEIVED
    assert p.on_hand_qty == 4

    po = PurchaseService(db_session).receive(po.id, ReceiptRequest(), user_id=admin_user.id)
    db_session.refresh(p)
    assert po.status == PurchaseOrderStatus.RECEIVED
    assert p.on_hand_qty == 10


# --- 7. Manufacturing production consumes components, produces finished good ----
def test_manufacturing_production(db_session, admin_user):
    comp = _product(db_session, admin_user.id, on_hand_qty=100)
    fin = _product(db_session, admin_user.id, on_hand_qty=0)
    bom = BoMService(db_session).create(
        BoMCreate(finished_product_id=fin.id, quantity=1,
                  components=[BoMComponentCreate(component_product_id=comp.id,
                                                 quantity_required=4)],
                  operations=[BoMOperationCreate(work_center="Assembly",
                                                 expected_duration=30)]),
        user_id=admin_user.id)
    mo = ManufacturingService(db_session).create(
        ManufacturingOrderCreate(bom_id=bom.id, quantity_to_produce=5),
        user_id=admin_user.id)
    ManufacturingService(db_session).confirm(mo.id, user_id=admin_user.id)
    ManufacturingService(db_session).start(mo.id, user_id=admin_user.id)
    mo = ManufacturingService(db_session).produce(mo.id, ProduceRequest(),
                                                  user_id=admin_user.id)
    db_session.refresh(comp)
    db_session.refresh(fin)
    assert mo.status == ManufacturingOrderStatus.DONE
    assert comp.on_hand_qty == 80   # 100 - (4 * 5)
    assert fin.on_hand_qty == 5
    assert mo.operations[0].actual_duration is not None


# --- 8. Cannot oversell / produce without stock --------------------------------
def test_production_insufficient_stock_rolls_back(db_session, admin_user):
    comp = _product(db_session, admin_user.id, on_hand_qty=3)  # need 4
    fin = _product(db_session, admin_user.id, on_hand_qty=0)
    bom = BoMService(db_session).create(
        BoMCreate(finished_product_id=fin.id, quantity=1,
                  components=[BoMComponentCreate(component_product_id=comp.id,
                                                 quantity_required=4)]),
        user_id=admin_user.id)
    mo = ManufacturingService(db_session).create(
        ManufacturingOrderCreate(bom_id=bom.id, quantity_to_produce=1),
        user_id=admin_user.id)
    ManufacturingService(db_session).confirm(mo.id, user_id=admin_user.id)
    ManufacturingService(db_session).start(mo.id, user_id=admin_user.id)
    with pytest.raises(InsufficientStockError):
        ManufacturingService(db_session).produce(mo.id, ProduceRequest(),
                                                 user_id=admin_user.id)
    db_session.rollback()
    db_session.refresh(comp)
    assert comp.on_hand_qty == 3  # unchanged: full rollback


# --- 9. Illegal status transition guarded --------------------------------------
def test_cannot_deliver_draft_order(db_session, admin_user):
    p = _product(db_session, admin_user.id, on_hand_qty=10)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=1)]),
        user_id=admin_user.id)
    with pytest.raises(BusinessRuleError):
        SalesService(db_session).deliver(so.id, DeliveryRequest(), user_id=admin_user.id)


# --- 10. Audit log written on product update -----------------------------------
def test_audit_log_on_product_update(db_session, admin_user):
    from schemas.product import ProductUpdate
    from services.audit_service import AuditService
    from utils.enums import AuditModule
    p = _product(db_session, admin_user.id, sales_price=10)
    ProductService(db_session).update(p.id, ProductUpdate(sales_price=20),
                                      user_id=admin_user.id)
    logs = AuditService(db_session).list_logs(module=AuditModule.PRODUCT, record_id=p.id)
    changed = {l.field_name: (l.old_value, l.new_value) for l in logs}
    assert "sales_price" in changed
    assert changed["sales_price"][1] == "20.0"


# --- 11. RBAC: unauthenticated request rejected --------------------------------
def test_products_require_auth(client):
    assert client.get("/api/v1/products").status_code == 401


# --- 12. Produced stock is re-allocated to the waiting Sales Order --------------
def test_mo_production_reallocates_stock_to_waiting_so(db_session, admin_user):
    """Stock=12, SO=13, auto-MO for 1; producing the MO must reserve the new
    unit back to the SO so the full 13 can be delivered."""
    uid = admin_user.id
    wood = _product(db_session, uid, name="Wood", on_hand_qty=100)
    bed = _product(db_session, uid, name="Bed", on_hand_qty=12,
                   procure_on_demand=True,
                   procurement_method=ProcurementMethod.MANUFACTURE)
    BoMService(db_session).create(
        BoMCreate(finished_product_id=bed.id, quantity=1,
                  components=[BoMComponentCreate(component_product_id=wood.id,
                                                 quantity_required=2)]),
        user_id=uid)

    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=bed.id, ordered_quantity=13)]),
        user_id=uid)
    result = SalesService(db_session).confirm(so.id, user_id=uid)

    db_session.refresh(bed)
    assert bed.reserved_qty == 12  # only available stock reserved at confirm
    assert len(result.generated_manufacturing_order_ids) == 1
    mo_id = result.generated_manufacturing_order_ids[0]

    # Drive the auto-created MO through to production.
    ManufacturingService(db_session).confirm(mo_id, user_id=uid)
    ManufacturingService(db_session).start(mo_id, user_id=uid)
    ManufacturingService(db_session).produce(mo_id, ProduceRequest(), user_id=uid)

    db_session.refresh(bed)
    # Newly produced unit was reserved back to the waiting SO.
    assert bed.on_hand_qty == 13
    assert bed.reserved_qty == 13

    # Ledger contains both the production and the re-allocation reservation.
    types = [m.movement_type
             for m in InventoryService(db_session).list_movements(product_id=bed.id)]
    assert MovementType.MO_PRODUCTION in types
    assert MovementType.SALE_RESERVATION in types

    # Full delivery of 13 now succeeds.
    so = SalesService(db_session).deliver(so.id, DeliveryRequest(), user_id=uid)
    assert so.status == SalesOrderStatus.DELIVERED

    db_session.refresh(bed)
    assert bed.reserved_qty == 0
    assert bed.on_hand_qty == 0


# --- 13. Re-allocation never double-reserves (idempotent on second supply) ------
def test_reallocation_does_not_double_reserve(db_session, admin_user):
    uid = admin_user.id
    bed = _product(db_session, uid, name="Bed", on_hand_qty=12)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=bed.id, ordered_quantity=13)]),
        user_id=uid)
    SalesService(db_session).confirm(so.id, user_id=uid)

    # Simulate two separate supply events of 1 unit each (e.g. two receipts).
    InventoryService(db_session).apply_movement(
        product_id=bed.id, movement_type=MovementType.PURCHASE_RECEIPT,
        quantity=1, reference_type=ReferenceType.PURCHASE_ORDER,
        reference_id=1, user_id=uid, on_hand_delta=+1)
    first = SalesService(db_session).reallocate_for_product(bed.id, uid)
    second = SalesService(db_session).reallocate_for_product(bed.id, uid)
    db_session.commit()

    db_session.refresh(bed)
    assert first == 1.0       # the one outstanding unit gets reserved
    assert second == 0.0      # nothing left to reserve -> no double reservation
    assert bed.reserved_qty == 13
    assert bed.free_to_use_qty == 0


# --- 14. Purchase receipt re-allocates new stock to the waiting Sales Order -----
def test_purchase_receipt_reallocates_stock_to_waiting_so(db_session, admin_user):
    """Regression: SO with Pencil=20 (available) + Phone=1 (shortage). Confirm
    reserves the pencils and auto-raises a PO for the phone; receiving that PO
    must reserve the new phone back to the SO so the full order is deliverable
    without manual intervention (previously the PO receipt skipped re-allocation).
    """
    uid = admin_user.id
    pencil = _product(db_session, uid, name="Pencil", on_hand_qty=20, sales_price=1)
    phone = _product(db_session, uid, name="Phone", on_hand_qty=0, sales_price=500,
                     cost_price=300, procure_on_demand=True,
                     procurement_method=ProcurementMethod.PURCHASE)

    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob", lines=[
            SalesOrderLineCreate(product_id=pencil.id, ordered_quantity=20),
            SalesOrderLineCreate(product_id=phone.id, ordered_quantity=1),
        ]),
        user_id=uid)
    result = SalesService(db_session).confirm(so.id, user_id=uid)

    db_session.refresh(pencil)
    db_session.refresh(phone)
    assert pencil.reserved_qty == 20            # available stock reserved
    assert phone.reserved_qty == 0              # nothing to reserve yet
    assert len(result.generated_purchase_order_ids) == 1
    po_id = result.generated_purchase_order_ids[0]
    po = PurchaseService(db_session).get(po_id)
    assert po.source_sales_order_id == so.id

    # Confirm + receive the auto-generated PO in full.
    PurchaseService(db_session).confirm(po_id, user_id=uid)
    PurchaseService(db_session).receive(po_id, ReceiptRequest(), user_id=uid)

    # The newly received phone is automatically reserved back to the SO.
    db_session.refresh(phone)
    assert phone.reserved_qty == 1
    assert phone.free_to_use_qty == 0

    so = SalesService(db_session).get(so.id)
    line_by_product = {l.product_id: l for l in so.lines}
    assert float(line_by_product[phone.id].reserved_quantity) == 1   # == ordered
    assert float(line_by_product[pencil.id].reserved_quantity) == 20

    # The re-allocation recorded a SALE_RESERVATION movement for the phone.
    phone_moves = InventoryService(db_session).list_movements(product_id=phone.id)
    assert MovementType.SALE_RESERVATION in [m.movement_type for m in phone_moves]

    # Delivery of the whole order now succeeds without manual intervention.
    so = SalesService(db_session).deliver(so.id, DeliveryRequest(), user_id=uid)
    assert so.status == SalesOrderStatus.DELIVERED
    db_session.refresh(phone)
    db_session.refresh(pencil)
    assert phone.on_hand_qty == 0 and phone.reserved_qty == 0
    assert pencil.on_hand_qty == 0 and pencil.reserved_qty == 0


# --- Invoicing (assisted Order-to-Cash) ----------------------------------------
def _delivered_so(db, uid, *, email="cust@example.com", qty=4, price=5, on_hand=10):
    """Create, confirm and fully deliver a sales order; return the SO."""
    p = _product(db, uid, on_hand_qty=on_hand, sales_price=price)
    so = SalesService(db).create(
        SalesOrderCreate(customer_name="Bob", customer_email=email,
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=qty)]),
        user_id=uid)
    SalesService(db).confirm(so.id, user_id=uid)
    so = SalesService(db).deliver(so.id, DeliveryRequest(), user_id=uid)
    assert so.status == SalesOrderStatus.DELIVERED
    return so


def test_generate_invoice_only_for_delivered_so(db_session, admin_user):
    from services.invoice_service import InvoiceService
    p = _product(db_session, admin_user.id, on_hand_qty=10, sales_price=5)
    so = SalesService(db_session).create(
        SalesOrderCreate(customer_name="Bob",
                         lines=[SalesOrderLineCreate(product_id=p.id, ordered_quantity=2)]),
        user_id=admin_user.id)
    with pytest.raises(BusinessRuleError):
        InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)


def test_generate_invoice_creates_one_invoice_with_totals(db_session, admin_user):
    from services.invoice_service import InvoiceService
    from utils.enums import InvoiceStatus
    so = _delivered_so(db_session, admin_user.id, qty=4, price=5)
    inv = InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)

    assert inv.status == InvoiceStatus.DRAFT
    assert inv.sales_order_id == so.id
    assert inv.customer_email == "cust@example.com"
    assert float(inv.total_amount) == 20.0       # 4 * 5
    assert len(inv.lines) == 1
    assert float(inv.lines[0].quantity) == 4
    assert inv.invoice_number.startswith("INV-")
    # PDF written to disk.
    import os
    assert inv.pdf_path and os.path.exists(inv.pdf_path)


def test_duplicate_invoice_blocked(db_session, admin_user):
    from services.invoice_service import InvoiceService
    so = _delivered_so(db_session, admin_user.id)
    InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)
    with pytest.raises(BusinessRuleError):
        InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)


def test_invoice_numbering_sequential_and_yearly(db_session, admin_user):
    from datetime import datetime
    from services.invoice_service import InvoiceService
    so1 = _delivered_so(db_session, admin_user.id)
    so2 = _delivered_so(db_session, admin_user.id)
    inv1 = InvoiceService(db_session).generate_invoice(so1.id, user_id=admin_user.id)
    inv2 = InvoiceService(db_session).generate_invoice(so2.id, user_id=admin_user.id)
    year = datetime.utcnow().year
    assert inv1.invoice_number == f"INV-{year}-001"
    assert inv2.invoice_number == f"INV-{year}-002"


def test_send_invoice_transitions_to_sent(db_session, admin_user):
    """No RESEND_API_KEY in tests -> simulation mode, still transitions DRAFT->SENT."""
    from services.invoice_service import InvoiceService
    from services.email_service import EmailService
    from utils.enums import InvoiceStatus
    so = _delivered_so(db_session, admin_user.id)
    inv = InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)
    sent = EmailService(db_session).send_invoice_email(inv.id, user_id=admin_user.id)
    assert sent.status == InvoiceStatus.SENT
    assert sent.sent_at is not None


def test_send_invoice_requires_email(db_session, admin_user):
    from services.invoice_service import InvoiceService
    from services.email_service import EmailService
    from utils.exceptions import ValidationError
    so = _delivered_so(db_session, admin_user.id, email=None)
    inv = InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)
    with pytest.raises(ValidationError):
        EmailService(db_session).send_invoice_email(inv.id, user_id=admin_user.id)


def test_invoice_audit_logs_written(db_session, admin_user):
    from services.invoice_service import InvoiceService
    from services.email_service import EmailService
    from services.audit_service import AuditService
    from utils.enums import AuditModule
    so = _delivered_so(db_session, admin_user.id)
    inv = InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)
    EmailService(db_session).send_invoice_email(inv.id, user_id=admin_user.id)
    logs = AuditService(db_session).list_logs(module=AuditModule.INVOICE, record_id=inv.id)
    fields = {l.field_name for l in logs}
    assert "invoice_number" in fields   # creation
    assert "status" in fields           # DRAFT -> SENT


def test_generate_invoice_via_api(db_session, admin_user, client, auth_headers):
    """End-to-end through the HTTP layer: generate, list, fetch, download."""
    so = _delivered_so(db_session, admin_user.id)
    r = client.post(f"/api/v1/sales-orders/{so.id}/generate-invoice", headers=auth_headers)
    assert r.status_code == 201, r.text
    inv = r.json()
    assert inv["status"] == "DRAFT"

    assert client.get("/api/v1/invoices", headers=auth_headers).status_code == 200
    assert client.get(f"/api/v1/invoices/{inv['id']}", headers=auth_headers).status_code == 200

    dl = client.get(f"/api/v1/invoices/{inv['id']}/download", headers=auth_headers)
    assert dl.status_code == 200
    assert dl.headers["content-type"] == "application/pdf"


# --- Executive dashboard summary aggregates correctly ---------------------------
def test_executive_summary(db_session, admin_user):
    from services.dashboard_service import DashboardService
    so = _delivered_so(db_session, admin_user.id, qty=4, price=5)  # delivers 4 @ 5
    from services.invoice_service import InvoiceService
    InvoiceService(db_session).generate_invoice(so.id, user_id=admin_user.id)

    summary = DashboardService(db_session).executive_summary()
    assert summary.revenue_this_month == 20.0          # 4 * 5, invoiced this month
    assert summary.sales_orders_total == 1
    assert summary.fulfillment_rate == 100.0           # 1 delivered / 1 confirmed-plus
    assert summary.outstanding_invoices == 1           # the generated invoice is DRAFT
    assert summary.outstanding_invoices_value == 20.0
    assert len(summary.revenue_trend) == 4
    assert summary.top_products and summary.top_products[0].units_sold == 4


def test_ai_import_normalize_merge_default_and_match(db_session, admin_user):
    """AI-extracted items: merge duplicates (sum), default missing qty to 1,
    and fuzzy-match names to the catalogue. No order is created."""
    from services.ai_import_service import AiImportService
    _product(db_session, admin_user.id, name="Wooden Table")
    _product(db_session, admin_user.id, name="Office Chair")
    db_session.commit()

    raw = {
        "customer_name": "ABC Furniture Pvt Ltd",
        "email": "purchase@abc.test",
        "address": "123 MG Road, Mumbai",
        "items": [
            {"product_name": "Wooden Table", "quantity": 5},
            {"product_name": "wooden table", "quantity": 3},   # dup → merge to 8
            {"product_name": "Office Chair"},                  # missing qty → 1
            {"product_name": "Unknown Widget", "quantity": 2}, # no match
        ],
    }
    result = AiImportService(db_session)._normalize_and_match(raw)

    assert result.customer_name == "ABC Furniture Pvt Ltd"
    assert result.address == "123 MG Road, Mumbai"
    by_name = {i.product_name.lower(): i for i in result.items}
    assert by_name["wooden table"].quantity == 8           # merged 5 + 3
    assert by_name["wooden table"].matched_product_id is not None
    assert by_name["office chair"].quantity == 1            # defaulted
    assert by_name["unknown widget"].matched_product_id is None  # unmatched


def test_executive_summary_via_api(db_session, admin_user, client, auth_headers):
    r = client.get("/api/v1/dashboard/executive-summary", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    for key in ("revenue_this_month", "fulfillment_rate", "inventory_health",
                "active_manufacturing", "outstanding_invoices", "top_products",
                "revenue_trend"):
        assert key in body
