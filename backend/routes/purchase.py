"""Purchase order routes — CRUD + confirm + receive + cancel."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.purchase import (
    PurchaseOrderCreate, PurchaseOrderOut, ReceiptRequest,
)
from services.purchase_service import PurchaseService
from utils.enums import PurchaseOrderStatus

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("", response_model=list[PurchaseOrderOut],
            dependencies=[Depends(require(P.PURCHASE_VIEW))])
def list_purchase(status_filter: PurchaseOrderStatus | None = None,
                  db: Session = Depends(get_db)):      
    return PurchaseService(db).list(status=status_filter)


@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.PURCHASE_CREATE))])
def create_purchase(payload: PurchaseOrderCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    return PurchaseService(db).create(payload, user_id=current_user.id)


@router.get("/{po_id}", response_model=PurchaseOrderOut,
            dependencies=[Depends(require(P.PURCHASE_VIEW))])
def get_purchase(po_id: int, db: Session = Depends(get_db)):
    return PurchaseService(db).get(po_id)


@router.post("/{po_id}/confirm", response_model=PurchaseOrderOut,
             dependencies=[Depends(require(P.PURCHASE_CONFIRM))])
def confirm_purchase(po_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    return PurchaseService(db).confirm(po_id, user_id=current_user.id)


@router.post("/{po_id}/receive", response_model=PurchaseOrderOut,
             dependencies=[Depends(require(P.PURCHASE_EDIT))])
def receive_purchase(po_id: int, payload: ReceiptRequest = ReceiptRequest(),
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Goods receipt: increases on_hand (supports partial receipts)."""
    return PurchaseService(db).receive(po_id, payload, user_id=current_user.id)


@router.post("/{po_id}/cancel", response_model=PurchaseOrderOut,
             dependencies=[Depends(require(P.PURCHASE_DELETE))])
def cancel_purchase(po_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    return PurchaseService(db).cancel(po_id, user_id=current_user.id)
