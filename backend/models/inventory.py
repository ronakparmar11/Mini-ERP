"""Inventory Movement — the immutable ledger of every stock change.

Append-only: rows are never updated or deleted. Together with audit logs this
gives full traceability: you can reconstruct on_hand for any product by
replaying its movements.
"""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import MovementType, ReferenceType


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)

    # Signed delta is implied by movement_type; we store the absolute magnitude
    # plus the type so reports can sum by direction unambiguously.
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    movement_type: Mapped[MovementType] = mapped_column(
        SAEnum(MovementType, name="movement_type_enum"), nullable=False, index=True
    )

    # Polymorphic source document pointer (kept loose for hackathon simplicity).
    reference_type: Mapped[ReferenceType] = mapped_column(
        SAEnum(ReferenceType, name="reference_type_enum"), nullable=False
    )
    reference_id: Mapped[int] = mapped_column(nullable=False)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False, index=True
    )

    product = relationship("Product", lazy="joined")
    user = relationship("User", lazy="joined")
