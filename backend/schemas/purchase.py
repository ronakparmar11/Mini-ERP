from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from utils.enums import PurchaseOrderStatus
from utils.quantity_validation import validate_whole_quantity


class PurchaseOrderLineCreate(BaseModel):
    product_id: int
    ordered_quantity: float = Field(gt=0)
    cost_price: float | None = Field(default=None, ge=0)

    @field_validator("ordered_quantity")
    @classmethod
    def _whole_qty(cls, v: float) -> float:
        return validate_whole_quantity(v)


class PurchaseOrderCreate(BaseModel):
    vendor: str = Field(min_length=1, max_length=200)
    responsible_person: str | None = None
    lines: list[PurchaseOrderLineCreate] = Field(min_length=1)


class ReceiptLine(BaseModel):
    line_id: int
    quantity: float = Field(gt=0)

    @field_validator("quantity")
    @classmethod
    def _whole_qty(cls, v: float) -> float:
        return validate_whole_quantity(v)


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
