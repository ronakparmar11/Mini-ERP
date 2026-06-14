from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from utils.enums import ProcurementMethod
from utils.quantity_validation import validate_whole_quantity


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sales_price: float = Field(ge=0, default=0)
    cost_price: float = Field(ge=0, default=0)
    on_hand_qty: float = Field(ge=0, default=0)
    procure_on_demand: bool = False
    procurement_method: ProcurementMethod = ProcurementMethod.PURCHASE
    vendor_id: int | None = None

    @field_validator("on_hand_qty")
    @classmethod
    def _whole_on_hand(cls, v: float) -> float:
        return validate_whole_quantity(v)


class ProductUpdate(BaseModel):
    """Stock quantities are intentionally NOT editable here — they may only be
    changed via inventory operations (purchase/sales/manufacturing) so the
    ledger stays authoritative."""
    name: str | None = Field(default=None, max_length=200)
    sales_price: float | None = Field(default=None, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    procure_on_demand: bool | None = None
    procurement_method: ProcurementMethod | None = None
    vendor_id: int | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sales_price: float
    cost_price: float
    on_hand_qty: float
    reserved_qty: float
    free_to_use_qty: float  # computed property on the model
    procure_on_demand: bool
    procurement_method: ProcurementMethod
    vendor_id: int | None
    created_at: datetime
