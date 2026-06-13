"""ProductService — product CRUD with audit logging.

Stock fields (on_hand/reserved) are deliberately not mutated here except for
the initial on_hand seed at creation: ongoing stock changes belong to
InventoryService so the ledger stays authoritative.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.product import Product
from schemas.product import ProductCreate, ProductUpdate
from services.audit_service import AuditService
from utils.enums import AuditModule
from utils.exceptions import BusinessRuleError, NotFoundError


# Fields we snapshot for audit diffing.
_AUDITED = (
    "name", "sales_price", "cost_price", "procure_on_demand",
    "procurement_method", "vendor_id",
)


def _snapshot(p: Product) -> dict:
    return {f: getattr(p, f) for f in _AUDITED}


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    def get(self, product_id: int) -> Product:
        product = self.db.get(Product, product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        return product

    def list(self, search: str | None = None) -> list[Product]:
        q = self.db.query(Product)
        if search:
            q = q.filter(Product.name.ilike(f"%{search}%"))
        return q.order_by(Product.id).all()

    def create(self, data: ProductCreate, user_id: int) -> Product:
        with unit_of_work(self.db):
            product = Product(
                name=data.name,
                sales_price=data.sales_price,
                cost_price=data.cost_price,
                on_hand_qty=data.on_hand_qty,  # opening balance
                reserved_qty=0,
                procure_on_demand=data.procure_on_demand,
                procurement_method=data.procurement_method,
                vendor_id=data.vendor_id,
            )
            self.db.add(product)
            self.db.flush()  # get product.id for the audit row
            self.audit.log_creation(
                module=AuditModule.PRODUCT, record_type="Product",
                record_id=product.id, snapshot=_snapshot(product), user_id=user_id,
            )
        self.db.refresh(product)
        return product

    def update(self, product_id: int, data: ProductUpdate, user_id: int) -> Product:
        product = self.get(product_id)
        before = _snapshot(product)
        with unit_of_work(self.db):
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(product, field, value)
            self.db.flush()
            self.audit.log_changes(
                module=AuditModule.PRODUCT, record_type="Product",
                record_id=product.id, before=before, after=_snapshot(product),
                user_id=user_id,
            )
        self.db.refresh(product)
        return product

    def delete(self, product_id: int) -> None:
        product = self.get(product_id)
        # Guard: never delete a product that still has stock or reservations.
        if float(product.on_hand_qty) != 0 or float(product.reserved_qty) != 0:
            raise BusinessRuleError(
                "Cannot delete a product that still has on-hand or reserved stock"
            )
        with unit_of_work(self.db):
            self.db.delete(product)
