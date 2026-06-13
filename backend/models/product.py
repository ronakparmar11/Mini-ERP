"""Product model — the central inventory entity.

Stock invariants (enforced by InventoryService, never mutated directly):
    free_to_use_qty = on_hand_qty - reserved_qty   (computed property)
    on_hand_qty   >= 0
    reserved_qty  >= 0 and reserved_qty <= on_hand_qty (logically)
"""
from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base, TimestampMixin
from utils.enums import ProcurementMethod


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)

    # Numeric(14, 3) keeps money/qty exact (no float rounding errors).
    sales_price: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)

    on_hand_qty: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    reserved_qty: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)

    # If true, confirming a sale with shortage auto-creates a PO/MO.
    procure_on_demand: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    procurement_method: Mapped[ProcurementMethod] = mapped_column(
        SAEnum(ProcurementMethod, name="procurement_method_enum"),
        default=ProcurementMethod.PURCHASE,
        nullable=False,
    )

    # Default vendor used when auto-creating a purchase order.
    vendor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    vendor = relationship("User", lazy="joined")

    @property
    def free_to_use_qty(self) -> float:
        """Quantity available to promise to new sales orders."""
        return float(self.on_hand_qty) - float(self.reserved_qty)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Product {self.id} {self.name} on_hand={self.on_hand_qty}>"
