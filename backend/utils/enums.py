"""Central enumerations for the ERP domain.

Using str-based Enums means values serialize cleanly to JSON and store as
readable strings in PostgreSQL (we use native VARCHAR + CHECK via SQLAlchemy
Enum rather than PG ENUM types, to keep Alembic migrations simple for a
hackathon while staying production-acceptable).
"""
from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    SYSTEM_USER = "SYSTEM_USER"


class ProcurementMethod(str, Enum):
    PURCHASE = "PURCHASE"
    MANUFACTURE = "MANUFACTURE"


class SalesOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class PurchaseOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class ManufacturingOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class InvoiceStatus(str, Enum):
    """Assisted invoice lifecycle. The ERP recommends invoicing but never sends
    automatically — the user moves DRAFT → SENT explicitly."""
    DRAFT = "DRAFT"
    SENT = "SENT"


class MovementType(str, Enum):
    """Every physical/logical stock change is tagged with one of these.

    SALE_RESERVATION : reserved_qty += (no on_hand change) at SO confirmation.
    SALE_DELIVERY    : on_hand -= and reserved -= at delivery.
    PURCHASE_RECEIPT : on_hand += at goods receipt.
    MO_CONSUMPTION   : on_hand -= for raw materials during production.
    MO_PRODUCTION    : on_hand += for the finished good during production.
    """
    SALE_RESERVATION = "SALE_RESERVATION"
    SALE_DELIVERY = "SALE_DELIVERY"
    PURCHASE_RECEIPT = "PURCHASE_RECEIPT"
    MO_CONSUMPTION = "MO_CONSUMPTION"
    MO_PRODUCTION = "MO_PRODUCTION"


class ReferenceType(str, Enum):
    """What document caused an inventory movement (for traceability)."""
    SALES_ORDER = "SALES_ORDER"
    PURCHASE_ORDER = "PURCHASE_ORDER"
    MANUFACTURING_ORDER = "MANUFACTURING_ORDER"


class AuditModule(str, Enum):
    PRODUCT = "PRODUCT"
    SALES_ORDER = "SALES_ORDER"
    PURCHASE_ORDER = "PURCHASE_ORDER"
    MANUFACTURING_ORDER = "MANUFACTURING_ORDER"
    BOM = "BOM"
    INVOICE = "INVOICE"
