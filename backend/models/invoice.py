"""Invoice + Invoice Line models — assisted Order-to-Cash.

An Invoice is an immutable financial snapshot generated from a DELIVERED sales
order. Lines are copied (not joined) so the invoice never drifts if the source
order or product later changes. One sales order can have at most one invoice
(enforced by the unique FK).
"""
from datetime import datetime

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database.base import Base
from utils.enums import InvoiceStatus


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    # One invoice per sales order (unique FK).
    sales_order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"), unique=True, nullable=False, index=True
    )

    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_email: Mapped[str | None] = mapped_column(String(200), nullable=True)

    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus, name="invoice_status_enum"),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)

    generated_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    sales_order = relationship("SalesOrder", lazy="joined")
    lines: Mapped[list["InvoiceLine"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    # Snapshot of the product name at invoice time (immutability).
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)

    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship(back_populates="lines")
