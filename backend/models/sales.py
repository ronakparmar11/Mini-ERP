"""Sales Order + Sales Order Line models."""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import SalesOrderStatus


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    salesperson: Mapped[str | None] = mapped_column(String(120), nullable=True)
    creation_date: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    status: Mapped[SalesOrderStatus] = mapped_column(
        SAEnum(SalesOrderStatus, name="sales_status_enum"),
        default=SalesOrderStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # cascade: deleting a draft SO removes its lines; orphan lines are pruned.
    lines: Mapped[list["SalesOrderLine"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def total_amount(self) -> float:
        return float(sum(line.total for line in self.lines))


class SalesOrderLine(Base):
    __tablename__ = "sales_order_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)

    ordered_quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    delivered_quantity: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    # Quantity of this line currently committed (reserved) in stock. Tracked per
    # line so newly produced/received supply can be re-allocated to the exact
    # outstanding demand without double-reserving.
    reserved_quantity: Mapped[float] = mapped_column(
        Numeric(14, 3), default=0, server_default="0", nullable=False
    )
    sales_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    order: Mapped["SalesOrder"] = relationship(back_populates="lines")
    product = relationship("Product", lazy="joined")

    @property
    def total(self) -> float:
        return float(self.ordered_quantity) * float(self.sales_price)

    @property
    def remaining_to_deliver(self) -> float:
        return float(self.ordered_quantity) - float(self.delivered_quantity)

    @property
    def remaining_to_reserve(self) -> float:
        """Demand still neither delivered nor reserved (drives re-allocation)."""
        return (float(self.ordered_quantity)
                - float(self.delivered_quantity)
                - float(self.reserved_quantity))
