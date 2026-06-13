"""ManufacturingService — manufacturing orders (MO) lifecycle.

Workflow:
    create (explode BoM -> snapshot components & operations, scaled by qty)
    confirm  DRAFT -> CONFIRMED
    start    CONFIRMED -> IN_PROGRESS
    produce  IN_PROGRESS -> DONE
        * consume raw materials  (on_hand -= required)  [MO_CONSUMPTION]
        * produce finished good  (on_hand += qty)       [MO_PRODUCTION]
        * record actual operation durations
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.bom import BillOfMaterials
from models.manufacturing import ManufacturingOrder, MOComponent, MOOperation
from schemas.manufacturing import ManufacturingOrderCreate, ProduceRequest
from services.audit_service import AuditService
from services.inventory_service import InventoryService
from utils.enums import AuditModule, ManufacturingOrderStatus
from utils.exceptions import BusinessRuleError, NotFoundError, ValidationError


class ManufacturingService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory = InventoryService(db)
        self.audit = AuditService(db)

    # ---- reads ----
    def get(self, mo_id: int) -> ManufacturingOrder:
        mo = self.db.get(ManufacturingOrder, mo_id)
        if mo is None:
            raise NotFoundError(f"Manufacturing order {mo_id} not found")
        return mo

    def list(self, status: ManufacturingOrderStatus | None = None) -> list[ManufacturingOrder]:
        q = self.db.query(ManufacturingOrder)
        if status is not None:
            q = q.filter(ManufacturingOrder.status == status)
        return q.order_by(ManufacturingOrder.id.desc()).all()

    # ---- internal builder (NO commit; for direct create + sales procurement) ----
    def _build_from_bom(
        self,
        *,
        bom: BillOfMaterials,
        quantity_to_produce: float,
        assignee: str | None = None,
        schedule_date: datetime | None = None,
        source_sales_order_id: int | None = None,
    ) -> ManufacturingOrder:
        """Explode a BoM into an MO, SCALING component needs by the production
        quantity relative to the BoM's reference batch size.

        scale = quantity_to_produce / bom.quantity
        """
        bom_batch = float(bom.quantity) or 1.0
        scale = float(quantity_to_produce) / bom_batch

        mo = ManufacturingOrder(
            finished_product_id=bom.finished_product_id,
            bom_id=bom.id,
            quantity_to_produce=quantity_to_produce,
            assignee=assignee,
            schedule_date=schedule_date,
            status=ManufacturingOrderStatus.DRAFT,
            source_sales_order_id=source_sales_order_id,
        )
        # Snapshot components (scaled) and operations onto the MO.
        for comp in bom.components:
            mo.components.append(MOComponent(
                component_product_id=comp.component_product_id,
                quantity_required=float(comp.quantity_required) * scale,
                quantity_consumed=0,
            ))
        for op in bom.operations:
            mo.operations.append(MOOperation(
                work_center=op.work_center,
                expected_duration=float(op.expected_duration) * scale,
                actual_duration=None,
            ))
        self.db.add(mo)
        self.db.flush()
        self.audit.log_creation(
            module=AuditModule.MANUFACTURING_ORDER, record_type="ManufacturingOrder",
            record_id=mo.id,
            snapshot={"status": mo.status, "finished_product_id": mo.finished_product_id,
                      "quantity_to_produce": mo.quantity_to_produce},
            user_id=None,
        )
        return mo

    # ---- public CRUD ----
    def create(self, data: ManufacturingOrderCreate, user_id: int) -> ManufacturingOrder:
        bom = self.db.get(BillOfMaterials, data.bom_id)
        if bom is None:
            raise NotFoundError(f"BoM {data.bom_id} not found")
        with unit_of_work(self.db):
            mo = self._build_from_bom(
                bom=bom,
                quantity_to_produce=data.quantity_to_produce,
                assignee=data.assignee,
                schedule_date=data.schedule_date,
            )
        self.db.refresh(mo)
        return mo

    def confirm(self, mo_id: int, user_id: int) -> ManufacturingOrder:
        mo = self.get(mo_id)
        if mo.status != ManufacturingOrderStatus.DRAFT:
            raise BusinessRuleError(f"Only DRAFT MOs can be confirmed (is {mo.status})")
        before = {"status": mo.status}
        with unit_of_work(self.db):
            mo.status = ManufacturingOrderStatus.CONFIRMED
            self._audit_status(mo, before)
        self.db.refresh(mo)
        return mo

    def start(self, mo_id: int, user_id: int) -> ManufacturingOrder:
        mo = self.get(mo_id)
        if mo.status != ManufacturingOrderStatus.CONFIRMED:
            raise BusinessRuleError(f"Only CONFIRMED MOs can start (is {mo.status})")
        before = {"status": mo.status}
        with unit_of_work(self.db):
            mo.status = ManufacturingOrderStatus.IN_PROGRESS
            self._audit_status(mo, before)
        self.db.refresh(mo)
        return mo

    def produce(self, mo_id: int, req: ProduceRequest, user_id: int) -> ManufacturingOrder:
        """Execute production: consume components, produce finished good.

        Atomic: if any component is short of stock, the whole production rolls
        back (no partial consumption). This protects inventory integrity.
        """
        mo = self.get(mo_id)
        if mo.status != ManufacturingOrderStatus.IN_PROGRESS:
            raise BusinessRuleError(
                f"MO must be IN_PROGRESS to produce (is {mo.status}). Start it first."
            )

        actual_by_op = {a.operation_id: a.actual_duration
                        for a in (req.operations or [])}
        before = {"status": mo.status}
        with unit_of_work(self.db):
            # 1) Consume raw materials. InventoryService enforces non-negative
            #    stock and raises InsufficientStockError -> full rollback.
            for comp in mo.components:
                qty = float(comp.quantity_required) - float(comp.quantity_consumed)
                if qty <= 0:
                    continue
                self.inventory.consume_for_manufacturing(
                    product_id=comp.component_product_id, qty=qty,
                    mo_id=mo.id, user_id=user_id,
                )
                comp.quantity_consumed = float(comp.quantity_required)

            # 2) Produce the finished good.
            self.inventory.produce_finished_good(
                product_id=mo.finished_product_id,
                qty=float(mo.quantity_to_produce),
                mo_id=mo.id, user_id=user_id,
            )

            # 2b) Re-allocate the freshly produced stock back to the Sales Orders
            #     that were short at confirmation (FIFO). Local import avoids a
            #     circular import (SalesService imports ManufacturingService).
            from services.sales_service import SalesService
            SalesService(self.db).reallocate_for_product(
                mo.finished_product_id, user_id
            )

            # 3) Record actual durations (default to expected if not provided).
            for op in mo.operations:
                op.actual_duration = actual_by_op.get(op.id, float(op.expected_duration))

            mo.status = ManufacturingOrderStatus.DONE
            self._audit_status(mo, before)
        self.db.refresh(mo)
        return mo

    def cancel(self, mo_id: int, user_id: int) -> ManufacturingOrder:
        mo = self.get(mo_id)
        if mo.status in (ManufacturingOrderStatus.DONE, ManufacturingOrderStatus.CANCELLED):
            raise BusinessRuleError(f"Cannot cancel a {mo.status} MO")
        before = {"status": mo.status}
        with unit_of_work(self.db):
            mo.status = ManufacturingOrderStatus.CANCELLED
            self._audit_status(mo, before)
        self.db.refresh(mo)
        return mo

    def _audit_status(self, mo: ManufacturingOrder, before: dict):
        self.audit.log_changes(
            module=AuditModule.MANUFACTURING_ORDER, record_type="ManufacturingOrder",
            record_id=mo.id, before=before, after={"status": mo.status}, user_id=None,
        )
