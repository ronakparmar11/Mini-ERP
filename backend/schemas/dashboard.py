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
