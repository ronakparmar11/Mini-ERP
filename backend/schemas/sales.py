from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from utils.enums import SalesOrderStatus


class SalesOrderLineCreate(BaseModel):
    product_id: int
    ordered_quantity: float = Field(gt=0)
    # If omitted, the service falls back to the product's sales_price.
    sales_price: float | None = Field(default=None, ge=0)


class SalesOrderCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    customer_email: str | None = Field(default=None, max_length=200)
    customer_address: str | None = None
    salesperson: str | None = None
    lines: list[SalesOrderLineCreate] = Field(min_length=1)


class DeliveryLine(BaseModel):
    line_id: int
    quantity: float = Field(gt=0)


class DeliveryRequest(BaseModel):
    """Quantities to deliver per line. If omitted entirely, the service
    delivers all remaining quantity for every line."""
    lines: list[DeliveryLine] | None = None


class SalesOrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    ordered_quantity: float
    delivered_quantity: float
    reserved_quantity: float
    sales_price: float
    total: float
    remaining_to_deliver: float


class SalesOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str
    customer_email: str | None
    customer_address: str | None
    salesperson: str | None
    creation_date: datetime
    status: SalesOrderStatus
    total_amount: float
    lines: list[SalesOrderLineOut]


class ConfirmationResult(BaseModel):
    """Returned by confirm() so the frontend knows what automation fired."""
    sales_order: SalesOrderOut
    generated_purchase_order_ids: list[int] = []
    generated_manufacturing_order_ids: list[int] = []
    messages: list[str] = []
