"""Purchase Order + Purchase Order Line models."""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import PurchaseOrderStatus


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor: Mapped[str] = mapped_column(String(200), nullable=False)
    responsible_person: Mapped[str | None] = mapped_column(String(120), nullable=True)
    creation_date: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        SAEnum(PurchaseOrderStatus, name="purchase_status_enum"),
        default=PurchaseOrderStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Optional back-link when this PO was auto-created from a sales shortage.
    source_sales_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales_orders.id"), nullable=True
    )

    lines: Mapped[list["PurchaseOrderLine"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def total_amount(self) -> float:
        return float(sum(line.total for line in self.lines))


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)

    ordered_quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    received_quantity: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    order: Mapped["PurchaseOrder"] = relationship(back_populates="lines")
    product = relationship("Product", lazy="joined")

    @property
    def total(self) -> float:
        return float(self.ordered_quantity) * float(self.cost_price)

    @property
    def remaining_to_receive(self) -> float:
        return float(self.ordered_quantity) - float(self.received_quantity)
