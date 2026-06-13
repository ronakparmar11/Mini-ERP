"""SalesService — sales order lifecycle and the procurement automation engine.

Confirmation rules (per product line):
    free = on_hand - reserved
    reservable = min(ordered, max(free, 0))    -> reserved += reservable
    shortage   = ordered - reservable
    if shortage > 0 and product.procure_on_demand:
        PURCHASE    -> auto-create a draft Purchase Order for the shortage
        MANUFACTURE -> auto-create a draft Manufacturing Order from its BoM

Everything (reservations + generated PO/MO + audit + movements) commits inside
ONE transaction. If procurement fails, the reservation rolls back too.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.bom import BillOfMaterials
from models.product import Product
from models.sales import SalesOrder, SalesOrderLine
from schemas.sales import ConfirmationResult, DeliveryRequest, SalesOrderCreate
from services.audit_service import AuditService
from services.inventory_service import InventoryService
from services.manufacturing_service import ManufacturingService
from services.purchase_service import PurchaseService
from utils.enums import (
    AuditModule, MovementType, ProcurementMethod, ReferenceType, SalesOrderStatus,
)
from utils.exceptions import BusinessRuleError, NotFoundError, ValidationError


class SalesService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory = InventoryService(db)
        self.audit = AuditService(db)
        self.purchase = PurchaseService(db)
        self.manufacturing = ManufacturingService(db)

    # ---- reads ----
    def get(self, so_id: int) -> SalesOrder:
        so = self.db.get(SalesOrder, so_id)
        if so is None:
            raise NotFoundError(f"Sales order {so_id} not found")
        return so

    def list(self, status: SalesOrderStatus | None = None) -> list[SalesOrder]:
        q = self.db.query(SalesOrder)
        if status is not None:
            q = q.filter(SalesOrder.status == status)
        return q.order_by(SalesOrder.id.desc()).all()

    # ---- create (DRAFT) ----
    def create(self, data: SalesOrderCreate, user_id: int) -> SalesOrder:
        with unit_of_work(self.db):
            so = SalesOrder(
                customer_name=data.customer_name,
                customer_email=data.customer_email,
                customer_address=data.customer_address,
                salesperson=data.salesperson,
                status=SalesOrderStatus.DRAFT,
            )
            for line in data.lines:
                product = self.db.get(Product, line.product_id)
                if product is None:
                    raise NotFoundError(f"Product {line.product_id} not found")
                so.lines.append(SalesOrderLine(
                    product_id=line.product_id,
                    ordered_quantity=line.ordered_quantity,
                    sales_price=(line.sales_price if line.sales_price is not None
                                 else float(product.sales_price)),
                ))
            self.db.add(so)
            self.db.flush()
            self.audit.log_creation(
                module=AuditModule.SALES_ORDER, record_type="SalesOrder",
                record_id=so.id, snapshot={"status": so.status,
                                           "customer_name": so.customer_name},
                user_id=user_id,
            )
        self.db.refresh(so)
        return so

    # ---- confirm (reserve stock + procurement automation) ----
    def confirm(self, so_id: int, user_id: int) -> ConfirmationResult:
        so = self.get(so_id)
        if so.status != SalesOrderStatus.DRAFT:
            raise BusinessRuleError(f"Only DRAFT sales orders can be confirmed (is {so.status})")

        generated_po_ids: list[int] = []
        generated_mo_ids: list[int] = []
        messages: list[str] = []
        before = {"status": so.status}

        # Aggregate shortages per product so we raise a single PO per vendor.
        purchase_shortage: dict[int, float] = defaultdict(float)

        with unit_of_work(self.db):
            for line in so.lines:
                product = self.db.get(Product, line.product_id)
                ordered = float(line.ordered_quantity)
                free = product.free_to_use_qty
                reservable = min(ordered, max(free, 0.0))

                # Step 1+2: reserve whatever is available right now.
                if reservable > 0:
                    self.inventory.reserve_for_sale(
                        product_id=product.id, qty=reservable,
                        so_id=so.id, user_id=user_id,
                    )
                    # Track the reservation on the line so later supply can fill
                    # only the still-outstanding remainder (no double-reserving).
                    line.reserved_quantity = float(line.reserved_quantity) + reservable
                    messages.append(
                        f"Reserved {reservable} of '{product.name}'."
                    )

                # Step 3: handle shortage via procurement (if enabled).
                shortage = ordered - reservable
                if shortage <= 1e-9:
                    continue
                if not product.procure_on_demand:
                    messages.append(
                        f"Shortage of {shortage} for '{product.name}' "
                        f"(procure_on_demand off — left unreserved)."
                    )
                    continue

                if product.procurement_method == ProcurementMethod.PURCHASE:
                    purchase_shortage[product.id] += shortage
                else:  # MANUFACTURE
                    mo_id = self._procure_by_manufacture(product, shortage, so, messages)
                    if mo_id is not None:
                        generated_mo_ids.append(mo_id)

            # Create one consolidated draft PO per vendor for purchase shortages.
            generated_po_ids.extend(
                self._procure_by_purchase(purchase_shortage, so, messages)
            )

            # Step 4: set the order status.
            # CONFIRMED regardless; procurement covers future supply.
            so.status = SalesOrderStatus.CONFIRMED
            self._audit_status(so, before)

        self.db.refresh(so)
        from schemas.sales import SalesOrderOut
        return ConfirmationResult(
            sales_order=SalesOrderOut.model_validate(so),
            generated_purchase_order_ids=generated_po_ids,
            generated_manufacturing_order_ids=generated_mo_ids,
            messages=messages,
        )

    def _procure_by_purchase(self, shortage_by_product: dict[int, float],
                             so: SalesOrder, messages: list[str]) -> list[int]:
        """Group shortages by the product's default vendor and raise draft POs."""
        if not shortage_by_product:
            return []
        by_vendor: dict[str, list[tuple[int, float, float | None]]] = defaultdict(list)
        for product_id, qty in shortage_by_product.items():
            product = self.db.get(Product, product_id)
            vendor_name = product.vendor.name if product.vendor else "TBD Vendor"
            by_vendor[vendor_name].append((product_id, qty, float(product.cost_price)))

        po_ids = []
        for vendor_name, items in by_vendor.items():
            po = self.purchase._build_order(
                vendor=vendor_name,
                responsible_person=so.salesperson,
                line_items=items,
                source_sales_order_id=so.id,
            )
            po_ids.append(po.id)
            messages.append(
                f"Auto-created Purchase Order #{po.id} ({vendor_name}) for shortage."
            )
        return po_ids

    def _procure_by_manufacture(self, product: Product, shortage: float,
                                so: SalesOrder, messages: list[str]) -> int | None:
        """Auto-create a Manufacturing Order from the product's BoM."""
        bom = (self.db.query(BillOfMaterials)
               .filter(BillOfMaterials.finished_product_id == product.id)
               .order_by(BillOfMaterials.id.desc())
               .first())
        if bom is None:
            messages.append(
                f"Shortage of {shortage} for '{product.name}' needs MANUFACTURE "
                f"but no BoM exists — please create one."
            )
            return None
        mo = self.manufacturing._build_from_bom(
            bom=bom,
            quantity_to_produce=shortage,
            assignee=so.salesperson,
            source_sales_order_id=so.id,
        )
        messages.append(
            f"Auto-created Manufacturing Order #{mo.id} for '{product.name}' "
            f"(qty {shortage})."
        )
        return mo.id

    # ---- supply re-allocation (called after MO completion / goods receipt) ----
    def reallocate_for_product(self, product_id: int, user_id: int | None) -> float:
        """Reserve newly available free stock against waiting Sales Orders.

        Thin wrapper kept for backwards compatibility. The shared implementation
        now lives in InventoryService.reallocate_reservations so that both
        goods receipts (PurchaseService.receive) and production runs
        (ManufacturingService.produce) reuse the exact same logic.
        """
        return self.inventory.reallocate_reservations(product_id, user_id)

    # ---- delivery (reduce reserved + on_hand) ----
    def deliver(self, so_id: int, req: DeliveryRequest, user_id: int) -> SalesOrder:
        so = self.get(so_id)
        if so.status not in (SalesOrderStatus.CONFIRMED,
                             SalesOrderStatus.PARTIALLY_DELIVERED):
            raise BusinessRuleError(
                f"Sales order must be CONFIRMED/PARTIALLY_DELIVERED to deliver (is {so.status})"
            )

        lines_by_id = {l.id: l for l in so.lines}
        if req.lines:
            plan = []
            for item in req.lines:
                line = lines_by_id.get(item.line_id)
                if line is None:
                    raise ValidationError(f"Line {item.line_id} not on SO {so_id}")
                if item.quantity > line.remaining_to_deliver + 1e-9:
                    raise BusinessRuleError(
                        f"Line {line.id}: delivering {item.quantity} exceeds "
                        f"remaining {line.remaining_to_deliver}"
                    )
                plan.append((line, item.quantity))
        else:
            plan = [(l, l.remaining_to_deliver) for l in so.lines
                    if l.remaining_to_deliver > 0]

        if not plan:
            raise BusinessRuleError("Nothing left to deliver on this sales order")

        before = {"status": so.status}
        with unit_of_work(self.db):
            for line, qty in plan:
                if qty <= 0:
                    continue
                # deliver_sale reduces BOTH reserved and on_hand atomically.
                self.inventory.deliver_sale(
                    product_id=line.product_id, qty=qty,
                    so_id=so.id, user_id=user_id,
                )
                line.delivered_quantity = float(line.delivered_quantity) + qty
                # The delivered quantity consumes its reservation.
                line.reserved_quantity = max(0.0, float(line.reserved_quantity) - qty)

            fully = all(l.remaining_to_deliver <= 1e-9 for l in so.lines)
            so.status = (SalesOrderStatus.DELIVERED if fully
                         else SalesOrderStatus.PARTIALLY_DELIVERED)
            self._audit_status(so, before)
        self.db.refresh(so)
        return so

    def cancel(self, so_id: int, user_id: int) -> SalesOrder:
        so = self.get(so_id)
        if so.status in (SalesOrderStatus.DELIVERED, SalesOrderStatus.CANCELLED):
            raise BusinessRuleError(f"Cannot cancel a {so.status} sales order")
        before = {"status": so.status}
        with unit_of_work(self.db):
            # Release any outstanding reservations back to free-to-use stock,
            # based on the quantity this order actually holds reserved.
            for line in so.lines:
                reserved = float(line.reserved_quantity)
                if reserved <= 0:
                    continue
                product = self.db.get(Product, line.product_id)
                release = min(reserved, float(product.reserved_qty))
                if release > 0:
                    # Negative reservation movement = release reserved stock.
                    self.inventory.apply_movement(
                        product_id=product.id,
                        movement_type=MovementType.SALE_RESERVATION,
                        quantity=release,
                        reference_type=ReferenceType.SALES_ORDER,
                        reference_id=so.id, user_id=user_id,
                        reserved_delta=-release,
                    )
                line.reserved_quantity = 0.0
            so.status = SalesOrderStatus.CANCELLED
            self._audit_status(so, before)
        self.db.refresh(so)
        return so

    def _audit_status(self, so: SalesOrder, before: dict):
        self.audit.log_changes(
            module=AuditModule.SALES_ORDER, record_type="SalesOrder",
            record_id=so.id, before=before, after={"status": so.status}, user_id=None,
        )
