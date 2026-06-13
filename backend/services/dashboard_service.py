"""DashboardService — aggregated read-only reporting for the home screen."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func

from sqlalchemy.orm import Session

from models.invoice import Invoice
from models.manufacturing import ManufacturingOrder
from models.product import Product
from models.purchase import PurchaseOrder
from models.sales import SalesOrder, SalesOrderLine
from schemas.dashboard import (
    ExecutiveSummary, InventorySummary, LowStockProduct, ManufacturingStats,
    PendingOrderSummary, RevenuePoint, TopProduct,
)
from utils.config import settings
from utils.enums import (
    InvoiceStatus, ManufacturingOrderStatus, PurchaseOrderStatus, SalesOrderStatus,
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

    def executive_summary(self) -> ExecutiveSummary:
        """Owner-facing rollup. Loads each table once, aggregates in Python."""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 1:
            last_month_start = month_start.replace(year=month_start.year - 1, month=12)
        else:
            last_month_start = month_start.replace(month=month_start.month - 1)

        # --- Invoices: revenue this/last month + outstanding (DRAFT) ---
        invoices = self.db.query(Invoice).all()

        def _gen(i):
            return i.generated_at

        rev_this = sum(float(i.total_amount) for i in invoices
                       if _gen(i) and _gen(i) >= month_start)
        rev_last = sum(float(i.total_amount) for i in invoices
                       if _gen(i) and last_month_start <= _gen(i) < month_start)
        change_pct = ((rev_this - rev_last) / rev_last * 100.0) if rev_last > 0 else None
        outstanding = [i for i in invoices if i.status == InvoiceStatus.DRAFT]
        outstanding_value = sum(float(i.total_amount) for i in outstanding)

        # --- Sales orders: totals + fulfillment rate ---
        sos = self.db.query(SalesOrder).all()
        awaiting = sum(1 for s in sos if s.status in (
            SalesOrderStatus.CONFIRMED, SalesOrderStatus.PARTIALLY_DELIVERED))
        delivered = sum(1 for s in sos if s.status == SalesOrderStatus.DELIVERED)
        confirmed_plus = sum(1 for s in sos if s.status in (
            SalesOrderStatus.CONFIRMED, SalesOrderStatus.PARTIALLY_DELIVERED,
            SalesOrderStatus.DELIVERED))
        fulfillment = (delivered / confirmed_plus * 100.0) if confirmed_plus else 0.0

        # --- Inventory health ---
        products = self.db.query(Product).all()
        total_p = len(products)
        low = [p for p in products if p.free_to_use_qty <= settings.LOW_STOCK_THRESHOLD]
        health = ((total_p - len(low)) / total_p * 100.0) if total_p else 100.0

        # --- Manufacturing: active + delayed (open & past schedule) ---
        mos = self.db.query(ManufacturingOrder).all()
        active = sum(1 for m in mos if m.status == ManufacturingOrderStatus.IN_PROGRESS)
        delayed = sum(1 for m in mos
                      if m.status in (ManufacturingOrderStatus.CONFIRMED,
                                      ManufacturingOrderStatus.IN_PROGRESS)
                      and m.schedule_date and m.schedule_date < now)

        # --- Top products by revenue from delivered sales-order lines ---
        agg: dict[int, list] = {}  # product_id -> [name, units, revenue]
        for line in self.db.query(SalesOrderLine).all():  # product is lazy="joined"
            sold = float(line.delivered_quantity)
            if sold <= 0:
                continue
            name = line.product.name if line.product else f"Product #{line.product_id}"
            entry = agg.setdefault(line.product_id, [name, 0.0, 0.0])
            entry[1] += sold
            entry[2] += sold * float(line.sales_price)
        top_sorted = sorted(agg.items(), key=lambda kv: kv[1][2], reverse=True)[:5]
        top_products = [TopProduct(product_id=pid, name=v[0], units_sold=v[1], revenue=v[2])
                        for pid, v in top_sorted]

        # --- Revenue trend: last 4 ISO weeks (Mon-anchored) from invoices ---
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0)
        trend: list[RevenuePoint] = []
        for w in range(3, -1, -1):
            start = week_start - timedelta(weeks=w)
            end = start + timedelta(weeks=1)
            rev = sum(float(i.total_amount) for i in invoices
                      if _gen(i) and start <= _gen(i) < end)
            label = "This week" if w == 0 else "Last week" if w == 1 else f"{w}w ago"
            trend.append(RevenuePoint(label=label, revenue=rev))

        return ExecutiveSummary(
            revenue_this_month=rev_this,
            revenue_change_pct=change_pct,
            sales_orders_total=len(sos),
            sales_orders_awaiting=awaiting,
            fulfillment_rate=fulfillment,
            inventory_health=health,
            products_attention=len(low),
            active_manufacturing=active,
            manufacturing_delayed=delayed,
            outstanding_invoices=len(outstanding),
            outstanding_invoices_value=outstanding_value,
            top_products=top_products,
            revenue_trend=trend,
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
