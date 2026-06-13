"""Invoice PDF generation using ReportLab.

Produces a clean, professional single-page invoice (header, customer block,
line-item table, grand total, footer) and writes it to the configured storage
directory. Returns the absolute path to the written file.
"""
from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from utils.config import settings

# Brand colour matching the frontend primary (#3525cd).
_PRIMARY = colors.HexColor("#3525cd")
_MUTED = colors.HexColor("#64748b")
_LINE = colors.HexColor("#e2e8f0")


def _money(value: float) -> str:
    return f"${float(value):,.2f}"


def generate_invoice_pdf(invoice, *, output_dir: str | None = None) -> str:
    """Render `invoice` (an Invoice ORM object with .lines loaded) to a PDF.

    Returns the path the PDF was written to.
    """
    directory = output_dir or settings.INVOICE_STORAGE_DIR
    os.makedirs(directory, exist_ok=True)
    path = str(Path(directory) / f"{invoice.invoice_number}.pdf")

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
        title=invoice.invoice_number,
    )

    styles = getSampleStyleSheet()
    h_company = ParagraphStyle("Company", parent=styles["Title"], textColor=_PRIMARY, fontSize=22)
    h_label = ParagraphStyle("Label", parent=styles["Normal"], textColor=_MUTED, fontSize=9)
    h_value = ParagraphStyle("Value", parent=styles["Normal"], fontSize=11)
    footer = ParagraphStyle("Footer", parent=styles["Normal"], textColor=_MUTED,
                            fontSize=10, alignment=1)

    elements: list = []

    # --- Header: company + invoice meta ---
    meta = (
        f"<b>Invoice</b><br/>"
        f"<font size=12 color='#3525cd'><b>{invoice.invoice_number}</b></font><br/>"
        f"Date: {invoice.generated_at:%d %b %Y}"
    )
    header = Table(
        [[Paragraph(settings.COMPANY_NAME, h_company), Paragraph(meta, h_value)]],
        colWidths=[100 * mm, 70 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 8 * mm))

    # --- Customer block ---
    elements.append(Paragraph("BILL TO", h_label))
    elements.append(Paragraph(f"<b>{invoice.customer_name}</b>", h_value))
    if invoice.customer_email:
        elements.append(Paragraph(invoice.customer_email, h_value))
    elements.append(Spacer(1, 8 * mm))

    # --- Line-item table ---
    data = [["Product", "Qty Delivered", "Unit Price", "Subtotal"]]
    for line in invoice.lines:
        data.append([
            line.product_name,
            f"{float(line.quantity):g}",
            _money(line.unit_price),
            _money(line.subtotal),
        ])

    table = Table(data, colWidths=[80 * mm, 30 * mm, 30 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, _LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))

    # --- Grand total ---
    total_tbl = Table(
        [["Grand Total", _money(invoice.total_amount)]],
        colWidths=[140 * mm, 30 * mm],
    )
    total_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("TEXTCOLOR", (1, 0), (1, 0), _PRIMARY),
        ("LINEABOVE", (0, 0), (-1, 0), 1, _PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(total_tbl)
    elements.append(Spacer(1, 18 * mm))

    elements.append(Paragraph("Thank you for your business.", footer))

    doc.build(elements)
    return path
