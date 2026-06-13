"""PurchaseService — purchase orders + goods receipt.

Receiving increases on_hand (via InventoryService) and supports partial
receipts, transitioning status DRAFT->CONFIRMED->PARTIALLY_RECEIVED->RECEIVED.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.product import Product
from models.purchase import PurchaseOrder, PurchaseOrderLine
from schemas.purchase import PurchaseOrderCreate, ReceiptRequest
from services.audit_service import AuditService
from services.inventory_service import InventoryService
from utils.enums import AuditModule, PurchaseOrderStatus
from utils.exceptions import BusinessRuleError, NotFoundError, ValidationError


class PurchaseService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory = InventoryService(db)
        self.audit = AuditService(db)

    # ---- reads ----
    def get(self, po_id: int) -> PurchaseOrder:
        po = self.db.get(PurchaseOrder, po_id)
        if po is None:
            raise NotFoundError(f"Purchase order {po_id} not found")
        return po

    def list(self, status: PurchaseOrderStatus | None = None) -> list[PurchaseOrder]:
        q = self.db.query(PurchaseOrder)
        if status is not None:
            q = q.filter(PurchaseOrder.status == status)
        return q.order_by(PurchaseOrder.id.desc()).all()

    # ---- internal builder (NO commit; runs inside caller's transaction) ----
    def _build_order(
        self,
        *,
        vendor: str,
        responsible_person: str | None,
        line_items: list[tuple[int, float, float | None]],
        source_sales_order_id: int | None = None,
    ) -> PurchaseOrder:
        """line_items: list of (product_id, qty, cost_price_or_None)."""
        po = PurchaseOrder(
            vendor=vendor,
            responsible_person=responsible_person,
            status=PurchaseOrderStatus.DRAFT,
            source_sales_order_id=source_sales_order_id,
        )
        for product_id, qty, cost in line_items:
            product = self.db.get(Product, product_id)
            if product is None:
                raise NotFoundError(f"Product {product_id} not found")
            po.lines.append(
                PurchaseOrderLine(
                    product_id=product_id,
                    ordered_quantity=qty,
                    cost_price=cost if cost is not None else float(product.cost_price),
                )
            )
        self.db.add(po)
        self.db.flush()
        self.audit.log_creation(
            module=AuditModule.PURCHASE_ORDER, record_type="PurchaseOrder",
            record_id=po.id, snapshot={"status": po.status, "vendor": po.vendor},
            user_id=None,
        )
        return po

    # ---- public CRUD ----
    def create(self, data: PurchaseOrderCreate, user_id: int) -> PurchaseOrder:
        with unit_of_work(self.db):
            po = self._build_order(
                vendor=data.vendor,
                responsible_person=data.responsible_person,
                line_items=[(l.product_id, l.ordered_quantity, l.cost_price)
                            for l in data.lines],
            )
        self.db.refresh(po)
        return po

    def confirm(self, po_id: int, user_id: int) -> PurchaseOrder:
        po = self.get(po_id)
        if po.status != PurchaseOrderStatus.DRAFT:
            raise BusinessRuleError(f"Only DRAFT purchase orders can be confirmed (is {po.status})")
        before = {"status": po.status}
        with unit_of_work(self.db):
            po.status = PurchaseOrderStatus.CONFIRMED
            self._audit_status(po, before)
        self.db.refresh(po)
        return po

    def receive(self, po_id: int, req: ReceiptRequest, user_id: int) -> PurchaseOrder:
        """Goods receipt: increase on_hand for received quantities.

        Each received line raises on_hand via InventoryService (which logs a
        PURCHASE_RECEIPT movement). Status moves to PARTIALLY_RECEIVED or
        RECEIVED depending on whether all lines are fully received.
        """
        po = self.get(po_id)
        if po.status not in (PurchaseOrderStatus.CONFIRMED,
                             PurchaseOrderStatus.PARTIALLY_RECEIVED):
            raise BusinessRuleError(
                f"Purchase order must be CONFIRMED/PARTIALLY_RECEIVED to receive (is {po.status})"
            )

        # Build the per-line receipt plan. Default = receive all remaining.
        lines_by_id = {l.id: l for l in po.lines}
        if req.lines:
            plan = []
            for item in req.lines:
                line = lines_by_id.get(item.line_id)
                if line is None:
                    raise ValidationError(f"Line {item.line_id} not on PO {po_id}")
                if item.quantity > line.remaining_to_receive + 1e-9:
                    raise BusinessRuleError(
                        f"Line {line.id}: receiving {item.quantity} exceeds "
                        f"remaining {line.remaining_to_receive}"
                    )
                plan.append((line, item.quantity))
        else:
            plan = [(l, l.remaining_to_receive) for l in po.lines
                    if l.remaining_to_receive > 0]

        if not plan:
            raise BusinessRuleError("Nothing left to receive on this purchase order")

        before = {"status": po.status}
        with unit_of_work(self.db):
            received_product_ids: list[int] = []
            for line, qty in plan:
                if qty <= 0:
                    continue
                self.inventory.receive_purchase(
                    product_id=line.product_id, qty=qty,
                    po_id=po.id, user_id=user_id,
                )
                line.received_quantity = float(line.received_quantity) + qty
                if line.product_id not in received_product_ids:
                    received_product_ids.append(line.product_id)

            # Re-allocate the freshly received stock back to the Sales Orders
            # that were short at confirmation (FIFO). Mirrors the MO production
            # path so a received PO immediately makes its source SO deliverable.
            for product_id in received_product_ids:
                self.inventory.reallocate_reservations(product_id, user_id)

            fully = all(l.remaining_to_receive <= 1e-9 for l in po.lines)
            po.status = (PurchaseOrderStatus.RECEIVED if fully
                         else PurchaseOrderStatus.PARTIALLY_RECEIVED)
            self._audit_status(po, before)
        self.db.refresh(po)
        return po

    def cancel(self, po_id: int, user_id: int) -> PurchaseOrder:
        po = self.get(po_id)
        if po.status in (PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED):
            raise BusinessRuleError(f"Cannot cancel a {po.status} purchase order")
        before = {"status": po.status}
        with unit_of_work(self.db):
            po.status = PurchaseOrderStatus.CANCELLED
            self._audit_status(po, before)
        self.db.refresh(po)
        return po

    def _audit_status(self, po: PurchaseOrder, before: dict):
        self.audit.log_changes(
            module=AuditModule.PURCHASE_ORDER, record_type="PurchaseOrder",
            record_id=po.id, before=before, after={"status": po.status},
            user_id=None,
        )
