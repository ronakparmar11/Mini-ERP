from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from utils.enums import PurchaseOrderStatus


class PurchaseOrderLineCreate(BaseModel):
    product_id: int
    ordered_quantity: float = Field(gt=0)
    cost_price: float | None = Field(default=None, ge=0)


class PurchaseOrderCreate(BaseModel):
    vendor: str = Field(min_length=1, max_length=200)
    responsible_person: str | None = None
    lines: list[PurchaseOrderLineCreate] = Field(min_length=1)


class ReceiptLine(BaseModel):
    line_id: int
    quantity: float = Field(gt=0)


class ReceiptRequest(BaseModel):
    """Quantities received per line. If omitted, receive all remaining."""
    lines: list[ReceiptLine] | None = None


class PurchaseOrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    ordered_quantity: float
    received_quantity: float
    cost_price: float
    total: float
    remaining_to_receive: float


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor: str
    responsible_person: str | None
    creation_date: datetime
    status: PurchaseOrderStatus
    source_sales_order_id: int | None
    total_amount: float
    lines: list[PurchaseOrderLineOut]
