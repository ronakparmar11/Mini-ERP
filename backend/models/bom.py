"""Bill of Materials: defines how a finished product is built.

A BoM = one finished product + N component lines + M operations.
Manufacturing Orders are exploded from a BoM at creation time.
"""
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base, TimestampMixin


class BillOfMaterials(Base, TimestampMixin):
    __tablename__ = "boms"

    id: Mapped[int] = mapped_column(primary_key=True)
    finished_product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"), nullable=False, index=True
    )
    # Reference batch size this BoM produces (e.g. components are "per 1 unit").
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), default=1, nullable=False)

    finished_product = relationship("Product", lazy="joined")
    components: Mapped[list["BoMComponent"]] = relationship(
        back_populates="bom", cascade="all, delete-orphan", lazy="selectin"
    )
    operations: Mapped[list["BoMOperation"]] = relationship(
        back_populates="bom", cascade="all, delete-orphan", lazy="selectin"
    )


class BoMComponent(Base):
    __tablename__ = "bom_components"

    id: Mapped[int] = mapped_column(primary_key=True)
    bom_id: Mapped[int] = mapped_column(
        ForeignKey("boms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    component_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    # Quantity of this component required to produce `BoM.quantity` finished units.
    quantity_required: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)

    bom: Mapped["BillOfMaterials"] = relationship(back_populates="components")
    component_product = relationship("Product", lazy="joined")


class BoMOperation(Base):
    __tablename__ = "bom_operations"

    id: Mapped[int] = mapped_column(primary_key=True)
    bom_id: Mapped[int] = mapped_column(
        ForeignKey("boms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    work_center: Mapped[str] = mapped_column(String(120), nullable=False)
    expected_duration: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )  # minutes

    bom: Mapped["BillOfMaterials"] = relationship(back_populates="operations")
