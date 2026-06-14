"""EmailService — sends a generated invoice to the customer via Resend.

The user stays in control: emailing is an explicit action, never automatic.
If RESEND_API_KEY is not configured the service runs in *simulation mode* — it
performs every step except the network call — so the workflow (and tests) stay
fully functional offline. When a key is present, a real email with the invoice
PDF attached is dispatched.
"""
from __future__ import annotations

import base64
import logging
import os
from datetime import datetime

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.invoice import Invoice
from services.audit_service import AuditService
from services.invoice_service import InvoiceService
from services.notification_service import NotificationService
from utils.config import settings
from utils.enums import AuditModule, InvoiceStatus
from utils.exceptions import BusinessRuleError, NotFoundError, ValidationError
from utils.pdf_generator import generate_invoice_pdf

logger = logging.getLogger("mini_erp")


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
        self.invoices = InvoiceService(db)

    def send_invoice_email(self, invoice_id: int, user_id: int | None = None) -> Invoice:
        invoice = self.db.get(Invoice, invoice_id)
        if invoice is None:
            raise NotFoundError(f"Invoice {invoice_id} not found")
        if not invoice.customer_email:
            raise ValidationError("Customer email is required before sending invoices.")
        if invoice.status == InvoiceStatus.SENT:
            raise BusinessRuleError("This invoice has already been sent.")

        # Ensure the PDF exists (regenerate if the file is missing).
        pdf_path = invoice.pdf_path
        if not pdf_path or not os.path.exists(pdf_path):
            pdf_path = generate_invoice_pdf(invoice)
            invoice.pdf_path = pdf_path

        self._dispatch(invoice, pdf_path)

        before = {"status": invoice.status, "sent_at": invoice.sent_at}
        with unit_of_work(self.db):
            invoice.status = InvoiceStatus.SENT
            invoice.sent_at = datetime.utcnow()
            self.audit.log_changes(
                module=AuditModule.INVOICE, record_type="Invoice",
                record_id=invoice.id, before=before,
                after={"status": invoice.status, "sent_at": invoice.sent_at},
                user_id=user_id,
            )
            # Notify all admins about the sent invoice.
            if user_id is not None:
                from models.user import User
                user = self.db.get(User, user_id)
                user_name = user.name if user else "Unknown"
            else:
                user_name = "System"
            NotificationService(self.db).create_for_admins(
                title="Invoice Sent",
                message=f"{user_name} emailed Invoice {invoice.invoice_number}.",
            )
        self.db.refresh(invoice)
        return invoice

    def _dispatch(self, invoice: Invoice, pdf_path: str) -> None:
        """Send the email via Resend, or simulate if no API key is configured."""
        api_key = settings.RESEND_API_KEY
        if not api_key:
            logger.warning(
                "RESEND_API_KEY not set — simulating dispatch of %s to %s (dev mode).",
                invoice.invoice_number, invoice.customer_email,
            )
            return

        with open(pdf_path, "rb") as fh:
            content = base64.b64encode(fh.read()).decode("ascii")

        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [invoice.customer_email],
            "subject": f"Invoice {invoice.invoice_number} from {settings.COMPANY_NAME}",
            "html": (
                f"<p>Dear {invoice.customer_name},</p>"
                f"<p>Please find attached invoice <b>{invoice.invoice_number}</b> "
                f"for a total of ${float(invoice.total_amount):,.2f}.</p>"
                f"<p>Thank you for your business.</p>"
            ),
            "attachments": [{
                "filename": f"{invoice.invoice_number}.pdf",
                "content": content,
            }],
        })
