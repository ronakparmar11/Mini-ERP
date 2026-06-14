"""Model registry.

Import every model here so that `Base.metadata` is fully populated whenever
this package is imported (critical for Alembic autogenerate and create_all).
"""
from database.base import Base
from models.user import User
from models.product import Product
from models.sales import SalesOrder, SalesOrderLine
from models.purchase import PurchaseOrder, PurchaseOrderLine
from models.bom import BillOfMaterials, BoMComponent, BoMOperation
from models.manufacturing import ManufacturingOrder, MOComponent, MOOperation
from models.inventory import InventoryMovement
from models.audit import AuditLog
from models.invoice import Invoice, InvoiceLine
from models.notification import Notification

__all__ = [
    "Base",
    "User",
    "Product",
    "SalesOrder",
    "SalesOrderLine",
    "PurchaseOrder",
    "PurchaseOrderLine",
    "BillOfMaterials",
    "BoMComponent",
    "BoMOperation",
    "ManufacturingOrder",
    "MOComponent",
    "MOOperation",
    "InventoryMovement",
    "AuditLog",
    "Invoice",
    "InvoiceLine",
    "Notification",
]
