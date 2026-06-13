from datetime import datetime

from pydantic import BaseModel, ConfigDict

from utils.enums import MovementType, ReferenceType


class InventoryMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: float
    movement_type: MovementType
    reference_type: ReferenceType
    reference_id: int
    user_id: int | None
    timestamp: datetime
