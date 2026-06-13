"""Invoice routes — assisted Order-to-Cash.

Endpoints:
    GET  /invoices                              list invoices (optional status)
    GET  /invoices/{id}                         invoice detail
    POST /sales-orders/{id}/generate-invoice    generate from a DELIVERED SO
    POST /invoices/{id}/send-email              email the invoice (DRAFT -> SENT)
    GET  /invoices/{id}/download                download the generated PDF
"""
import os

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.invoice import InvoiceOut
from services.email_service import EmailService
from services.invoice_service import InvoiceService
from utils.enums import InvoiceStatus
from utils.exceptions import NotFoundError

router = APIRouter(tags=["Invoices"])


@router.get("/invoices", response_model=list[InvoiceOut],
            dependencies=[Depends(require(P.INVOICE_VIEW))])
def list_invoices(status_filter: InvoiceStatus | None = None,
                  db: Session = Depends(get_db)):
    return InvoiceService(db).list(status=status_filter)


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut,
            dependencies=[Depends(require(P.INVOICE_VIEW))])
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return InvoiceService(db).get(invoice_id)


@router.post("/sales-orders/{so_id}/generate-invoice", response_model=InvoiceOut,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.INVOICE_CREATE))])
def generate_invoice(so_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Generate an invoice (+ PDF) for a delivered sales order."""
    return InvoiceService(db).generate_invoice(so_id, user_id=current_user.id)


@router.post("/invoices/{invoice_id}/send-email", response_model=InvoiceOut,
             dependencies=[Depends(require(P.INVOICE_SEND))])
def send_invoice_email(invoice_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Email the invoice PDF to the customer and mark it SENT."""
    return EmailService(db).send_invoice_email(invoice_id, user_id=current_user.id)


@router.get("/invoices/{invoice_id}/download",
            dependencies=[Depends(require(P.INVOICE_VIEW))])
def download_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Stream the generated invoice PDF."""
    service = InvoiceService(db)
    invoice = service.get(invoice_id)
    pdf_path = invoice.pdf_path
    if not pdf_path or not os.path.exists(pdf_path):
        # Regenerate on the fly if the file was lost (e.g. ephemeral storage).
        from utils.pdf_generator import generate_invoice_pdf
        pdf_path = generate_invoice_pdf(invoice)
        invoice.pdf_path = pdf_path
        db.commit()
    if not os.path.exists(pdf_path):
        raise NotFoundError("Invoice PDF not found")
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"{invoice.invoice_number}.pdf")
