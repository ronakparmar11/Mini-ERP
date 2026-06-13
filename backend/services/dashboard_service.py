"""DashboardService — aggregated read-only reporting for the home screen."""
from __future__ import annotations

from sqlalchemy import func

from sqlalchemy.orm import Session

from models.manufacturing import ManufacturingOrder
from models.product import Product
from models.purchase import PurchaseOrder
from models.sales import SalesOrder
from schemas.dashboard import (
    InventorySummary, LowStockProduct, ManufacturingStats, PendingOrderSummary,
)
from utils.config import settings
from utils.enums import (
    ManufacturingOrderStatus, PurchaseOrderStatus, SalesOrderStatus,
)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def low_stock(self, threshold: float | None = None) -> list[LowStockProduct]:
        """Products whose free-to-use quantity is at/below the threshold."""
        limit = threshold if threshold is not None else settings.LOW_STOCK_THRESHOLD
        products = self.db.query(Product).all()
        out = []
        for p in products:
            if p.free_to_use_qty <= limit:
                out.append(LowStockProduct(
                    product_id=p.id, name=p.name,
                    on_hand_qty=float(p.on_hand_qty),
                    reserved_qty=float(p.reserved_qty),
                    free_to_use_qty=p.free_to_use_qty,
                ))
        return out

    def pending_sales(self) -> list[PendingOrderSummary]:
        rows = (self.db.query(SalesOrder)
                .filter(SalesOrder.status.in_([
                    SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED,
                    SalesOrderStatus.PARTIALLY_DELIVERED]))
                .order_by(SalesOrder.id.desc()).all())
        return [PendingOrderSummary(
            id=so.id, reference=f"SO-{so.id} {so.customer_name}",
            status=so.status.value, total_amount=so.total_amount) for so in rows]

    def pending_purchases(self) -> list[PendingOrderSummary]:
        rows = (self.db.query(PurchaseOrder)
                .filter(PurchaseOrder.status.in_([
                    PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED,
                    PurchaseOrderStatus.PARTIALLY_RECEIVED]))
                .order_by(PurchaseOrder.id.desc()).all())
        return [PendingOrderSummary(
            id=po.id, reference=f"PO-{po.id} {po.vendor}",
            status=po.status.value, total_amount=po.total_amount) for po in rows]

    def pending_manufacturing(self) -> list[PendingOrderSummary]:
        rows = (self.db.query(ManufacturingOrder)
                .filter(ManufacturingOrder.status.in_([
                    ManufacturingOrderStatus.DRAFT, ManufacturingOrderStatus.CONFIRMED,
                    ManufacturingOrderStatus.IN_PROGRESS]))
                .order_by(ManufacturingOrder.id.desc()).all())
        return [PendingOrderSummary(
            id=mo.id, reference=f"MO-{mo.id}", status=mo.status.value) for mo in rows]

    def manufacturing_stats(self) -> ManufacturingStats:
        # One grouped query instead of N status counts.
        counts = dict(
            self.db.query(ManufacturingOrder.status, func.count())
            .group_by(ManufacturingOrder.status).all()
        )

        def c(status):  # normalize enum/string keys
            return int(counts.get(status, 0))

        total = sum(int(v) for v in counts.values())
        done = c(ManufacturingOrderStatus.DONE)
        return ManufacturingStats(
            total=total,
            draft=c(ManufacturingOrderStatus.DRAFT),
            confirmed=c(ManufacturingOrderStatus.CONFIRMED),
            in_progress=c(ManufacturingOrderStatus.IN_PROGRESS),
            done=done,
            cancelled=c(ManufacturingOrderStatus.CANCELLED),
            completion_rate=(done / total) if total else 0.0,
        )

    def inventory_summary(self) -> InventorySummary:
        products = self.db.query(Product).all()
        total_on_hand = sum(float(p.on_hand_qty) for p in products)
        total_reserved = sum(float(p.reserved_qty) for p in products)
        total_value = sum(float(p.on_hand_qty) * float(p.cost_price) for p in products)
        return InventorySummary(
            total_products=len(products),
            total_on_hand=total_on_hand,
            total_reserved=total_reserved,
            total_free_to_use=total_on_hand - total_reserved,
            total_stock_value_at_cost=total_value,
        )
