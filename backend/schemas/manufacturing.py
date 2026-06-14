from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from utils.enums import ManufacturingOrderStatus
from utils.quantity_validation import validate_whole_quantity


class ManufacturingOrderCreate(BaseModel):
    bom_id: int
    quantity_to_produce: float = Field(gt=0)
    assignee: str | None = None
    schedule_date: datetime | None = None

    @field_validator("quantity_to_produce")
    @classmethod
    def _whole_qty(cls, v: float) -> float:
        return validate_whole_quantity(v)


class ProduceOperationActual(BaseModel):
    operation_id: int
    actual_duration: float = Field(ge=0)


class ProduceRequest(BaseModel):
    """Optional actual durations captured at production time."""
    operations: list[ProduceOperationActual] | None = None


class MOComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    component_product_id: int
    quantity_required: float
    quantity_consumed: float


class MOOperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_center: str
    expected_duration: float
    actual_duration: float | None


class ManufacturingOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    finished_product_id: int
    bom_id: int | None
    quantity_to_produce: float
    assignee: str | None
    schedule_date: datetime | None
    creation_date: datetime
    status: ManufacturingOrderStatus
    source_sales_order_id: int | None
    components: list[MOComponentOut]
    operations: list[MOOperationOut]
