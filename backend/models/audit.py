"""Audit Log — field-level change history for critical ERP records.

One row per changed field. Written by AuditService inside the same transaction
as the data mutation so the log can never drift from the data.
"""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import AuditModule


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    module: Mapped[AuditModule] = mapped_column(
        SAEnum(AuditModule, name="audit_module_enum"), nullable=False, index=True
    )
    record_type: Mapped[str] = mapped_column(String(80), nullable=False)
    record_id: Mapped[int] = mapped_column(nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(80), nullable=False)

    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False, index=True
    )

    user = relationship("User", lazy="joined")
