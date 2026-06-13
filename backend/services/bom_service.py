"""BoMService — Bill of Materials CRUD.

A BoM describes how to build one finished product: which components are
consumed and which operations (work centers) are performed. Manufacturing
Orders are exploded from a BoM.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.bom import BillOfMaterials, BoMComponent, BoMOperation
from models.product import Product
from schemas.bom import BoMCreate
from services.audit_service import AuditService
from utils.enums import AuditModule
from utils.exceptions import BusinessRuleError, NotFoundError


class BoMService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    def get(self, bom_id: int) -> BillOfMaterials:
        bom = self.db.get(BillOfMaterials, bom_id)
        if bom is None:
            raise NotFoundError(f"BoM {bom_id} not found")
        return bom

    def list(self, finished_product_id: int | None = None) -> list[BillOfMaterials]:
        q = self.db.query(BillOfMaterials)
        if finished_product_id is not None:
            q = q.filter(BillOfMaterials.finished_product_id == finished_product_id)
        return q.order_by(BillOfMaterials.id.desc()).all()

    def create(self, data: BoMCreate, user_id: int) -> BillOfMaterials:
        # Validate referenced products exist before building anything.
        if self.db.get(Product, data.finished_product_id) is None:
            raise NotFoundError(f"Finished product {data.finished_product_id} not found")
        for comp in data.components:
            if self.db.get(Product, comp.component_product_id) is None:
                raise NotFoundError(f"Component product {comp.component_product_id} not found")
            if comp.component_product_id == data.finished_product_id:
                raise BusinessRuleError("A product cannot be a component of itself")

        with unit_of_work(self.db):
            bom = BillOfMaterials(
                finished_product_id=data.finished_product_id,
                quantity=data.quantity,
            )
            for comp in data.components:
                bom.components.append(BoMComponent(
                    component_product_id=comp.component_product_id,
                    quantity_required=comp.quantity_required,
                ))
            for op in data.operations:
                bom.operations.append(BoMOperation(
                    work_center=op.work_center,
                    expected_duration=op.expected_duration,
                ))
            self.db.add(bom)
            self.db.flush()
            self.audit.log_creation(
                module=AuditModule.BOM, record_type="BillOfMaterials",
                record_id=bom.id,
                snapshot={"finished_product_id": bom.finished_product_id,
                          "quantity": bom.quantity},
                user_id=user_id,
            )
        self.db.refresh(bom)
        return bom

    def delete(self, bom_id: int) -> None:
        bom = self.get(bom_id)
        with unit_of_work(self.db):
            self.db.delete(bom)
