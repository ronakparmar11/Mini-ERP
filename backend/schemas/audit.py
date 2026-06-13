from datetime import datetime

from pydantic import BaseModel, ConfigDict

from utils.enums import AuditModule


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module: AuditModule
    record_type: str
    record_id: int
    field_name: str
    old_value: str | None
    new_value: str | None
    user_id: int | None
    timestamp: datetime
