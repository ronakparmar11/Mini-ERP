from datetime import datetime

from pydantic import BaseModel, ConfigDict

from utils.enums import InvoiceStatus


class InvoiceLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    subtotal: float


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    sales_order_id: int
    customer_name: str
    customer_email: str | None
    status: InvoiceStatus
    total_amount: float
    generated_at: datetime
    sent_at: datetime | None
    pdf_path: str | None
    lines: list[InvoiceLineOut]
