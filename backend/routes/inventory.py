"""Inventory movement (read-only ledger) routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import require
from dependencies.permissions import P
from schemas.inventory import InventoryMovementOut
from services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/movements", response_model=list[InventoryMovementOut],
            dependencies=[Depends(require(P.PRODUCTS_VIEW))])
def list_movements(product_id: int | None = None, limit: int = 200,
                   db: Session = Depends(get_db)):
    """Immutable stock ledger. Filter by product to trace its full history."""
    return InventoryService(db).list_movements(product_id=product_id, limit=limit)
