"""Manufacturing Order (MO) + exploded component/operation snapshots.

When an MO is created from a BoM we COPY (snapshot) the components and
operations onto the MO. This is deliberate: the BoM may change later, but the
MO must remain a faithful record of what was actually planned/consumed. This is
standard ERP behaviour (manufacturing traceability).
"""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import ManufacturingOrderStatus


class ManufacturingOrder(Base):
    __tablename__ = "manufacturing_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    finished_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    bom_id: Mapped[int | None] = mapped_column(ForeignKey("boms.id"), nullable=True)

    quantity_to_produce: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(120), nullable=True)
    schedule_date: Mapped[datetime | None] = mapped_column(nullable=True)
    creation_date: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    status: Mapped[ManufacturingOrderStatus] = mapped_column(
        SAEnum(ManufacturingOrderStatus, name="mo_status_enum"),
        default=ManufacturingOrderStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Optional back-link when this MO was auto-created from a sales shortage.
    source_sales_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales_orders.id"), nullable=True
    )

    finished_product = relationship("Product", lazy="joined")
    components: Mapped[list["MOComponent"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    operations: Mapped[list["MOOperation"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class MOComponent(Base):
    __tablename__ = "mo_components"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("manufacturing_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    component_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    # Total quantity required for the WHOLE MO (already scaled by qty_to_produce).
    quantity_required: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    quantity_consumed: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)

    order: Mapped["ManufacturingOrder"] = relationship(back_populates="components")
    component_product = relationship("Product", lazy="joined")


class MOOperation(Base):
    __tablename__ = "mo_operations"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("manufacturing_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    work_center: Mapped[str] = mapped_column(String(120), nullable=False)
    expected_duration: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    actual_duration: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    order: Mapped["ManufacturingOrder"] = relationship(back_populates="operations")
