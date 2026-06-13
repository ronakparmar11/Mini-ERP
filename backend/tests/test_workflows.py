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
    ProcurementMethod, PurchaseOrderStatus, SalesOrderStatus,
    ManufacturingOrderStatus,
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
