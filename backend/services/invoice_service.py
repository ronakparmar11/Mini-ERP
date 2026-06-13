"""InvoiceService — assisted Order-to-Cash.

Generates an immutable invoice from a DELIVERED sales order: copies customer
details + delivered line quantities, computes totals, allocates a sequential
invoice number, renders a PDF, and writes audit logs — all in one transaction.

The ERP *recommends* invoicing (see the frontend "Invoice & Billing" panel) but
never takes the financial action automatically; a user triggers generation.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.invoice import Invoice, InvoiceLine
from models.sales import SalesOrder
from services.audit_service import AuditService
from utils.config import settings
from utils.enums import AuditModule, InvoiceStatus, SalesOrderStatus
from utils.exceptions import BusinessRuleError, NotFoundError
from utils.pdf_generator import generate_invoice_pdf


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    # ---- reads ----
    def get(self, invoice_id: int) -> Invoice:
        inv = self.db.get(Invoice, invoice_id)
        if inv is None:
            raise NotFoundError(f"Invoice {invoice_id} not found")
        return inv

    def get_by_sales_order(self, sales_order_id: int) -> Invoice | None:
        return (self.db.query(Invoice)
                .filter(Invoice.sales_order_id == sales_order_id)
                .first())

    def list(self, status: InvoiceStatus | None = None) -> list[Invoice]:
        q = self.db.query(Invoice)
        if status is not None:
            q = q.filter(Invoice.status == status)
        return q.order_by(Invoice.id.desc()).all()

    # ---- invoice numbering: INV-{YEAR}-{SEQ}, sequence resets yearly ----
    def _next_invoice_number(self) -> str:
        year = datetime.utcnow().year
        prefix = f"INV-{year}-"
        # Highest sequence already used this year (0 if none) → next = +1.
        last = (self.db.query(func.max(Invoice.invoice_number))
                .filter(Invoice.invoice_number.like(f"{prefix}%"))
                .scalar())
        next_seq = 1
        if last:
            try:
                next_seq = int(str(last).rsplit("-", 1)[-1]) + 1
            except ValueError:
                next_seq = 1
        return f"{prefix}{next_seq:03d}"

    # ---- generation ----
    def generate_invoice(self, sales_order_id: int, user_id: int | None = None) -> Invoice:
        so = self.db.get(SalesOrder, sales_order_id)
        if so is None:
            raise NotFoundError(f"Sales order {sales_order_id} not found")
        if so.status != SalesOrderStatus.DELIVERED:
            raise BusinessRuleError("Only delivered orders can be invoiced.")
        if self.get_by_sales_order(so.id) is not None:
            raise BusinessRuleError("This order has already been invoiced.")

        with unit_of_work(self.db):
            invoice = Invoice(
                invoice_number=self._next_invoice_number(),
                sales_order_id=so.id,
                customer_name=so.customer_name,
                customer_email=so.customer_email,
                status=InvoiceStatus.DRAFT,
                total_amount=0,
            )
            total = 0.0
            for line in so.lines:
                qty = float(line.delivered_quantity)
                if qty <= 0:
                    continue
                unit_price = float(line.sales_price)
                subtotal = round(qty * unit_price, 2)
                total += subtotal
                product_name = line.product.name if line.product else f"Product #{line.product_id}"
                invoice.lines.append(InvoiceLine(
                    product_id=line.product_id,
                    product_name=product_name,
                    quantity=qty,
                    unit_price=unit_price,
                    subtotal=subtotal,
                ))
            invoice.total_amount = round(total, 2)
            self.db.add(invoice)
            self.db.flush()

            # Render the PDF immediately and store its path.
            invoice.pdf_path = generate_invoice_pdf(invoice)

            self.audit.log_creation(
                module=AuditModule.INVOICE, record_type="Invoice",
                record_id=invoice.id,
                snapshot={"invoice_number": invoice.invoice_number,
                          "sales_order_id": invoice.sales_order_id,
                          "status": invoice.status,
                          "total_amount": invoice.total_amount},
                user_id=user_id,
            )

        self.db.refresh(invoice)
        return invoice
