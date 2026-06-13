from pydantic import BaseModel


class LowStockProduct(BaseModel):
    product_id: int
    name: str
    on_hand_qty: float
    reserved_qty: float
    free_to_use_qty: float


class PendingOrderSummary(BaseModel):
    id: int
    reference: str
    status: str
    total_amount: float | None = None


class ManufacturingStats(BaseModel):
    total: int
    draft: int
    confirmed: int
    in_progress: int
    done: int
    cancelled: int
    completion_rate: float  # done / total


class InventorySummary(BaseModel):
    total_products: int
    total_on_hand: float
    total_reserved: float
    total_free_to_use: float
    total_stock_value_at_cost: float


class TopProduct(BaseModel):
    product_id: int
    name: str
    units_sold: float
    revenue: float


class RevenuePoint(BaseModel):
    label: str
    revenue: float


class ExecutiveSummary(BaseModel):
    """Aggregated, owner-facing KPIs for the executive dashboard. One payload =
    one round of full-table scans (no N+1)."""
    revenue_this_month: float
    revenue_change_pct: float | None  # vs. last month; None when no baseline
    sales_orders_total: int
    sales_orders_awaiting: int
    fulfillment_rate: float           # 0..100 (delivered / confirmed-or-beyond)
    inventory_health: float           # 0..100 (healthy / total products)
    products_attention: int           # products at/below low-stock threshold
    active_manufacturing: int         # MOs IN_PROGRESS
    manufacturing_delayed: int        # open MOs past their schedule date
    outstanding_invoices: int         # DRAFT invoices
    outstanding_invoices_value: float
    top_products: list[TopProduct]
    revenue_trend: list[RevenuePoint]
