from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BoMComponentCreate(BaseModel):
    component_product_id: int
    quantity_required: float = Field(gt=0)


class BoMOperationCreate(BaseModel):
    work_center: str = Field(min_length=1, max_length=120)
    expected_duration: float = Field(ge=0)  # minutes


class BoMCreate(BaseModel):
    finished_product_id: int
    quantity: float = Field(gt=0, default=1)
    components: list[BoMComponentCreate] = Field(min_length=1)
    operations: list[BoMOperationCreate] = []


class BoMComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    component_product_id: int
    quantity_required: float


class BoMOperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_center: str
    expected_duration: float


class BoMOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    finished_product_id: int
    quantity: float
    created_at: datetime
    components: list[BoMComponentOut]
    operations: list[BoMOperationOut]
