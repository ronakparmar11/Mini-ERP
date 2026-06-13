"""Sales order routes — CRUD + confirm + deliver + cancel + AI PDF import."""
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.ai_import import ImportedOrder
from schemas.sales import (
    ConfirmationResult, DeliveryRequest, SalesOrderCreate, SalesOrderOut,
)
from services.ai_import_service import AiImportService
from services.sales_service import SalesService
from utils.enums import SalesOrderStatus

router = APIRouter(prefix="/sales-orders", tags=["Sales Orders"])


@router.post("/import-pdf", response_model=ImportedOrder,
             dependencies=[Depends(require(P.SALES_CREATE))])
async def import_sales_order_pdf(file: UploadFile = File(...),
                                 db: Session = Depends(get_db)):
    """AI-extract customer + line items from a PDF for human review.

    Does NOT create anything — the user reviews/edits, then the normal
    POST /sales-orders flow creates the DRAFT order.
    """
    content = await file.read()
    return AiImportService(db).extract_order_from_pdf(content, filename=file.filename)


@router.get("", response_model=list[SalesOrderOut],
            dependencies=[Depends(require(P.SALES_VIEW))])
def list_sales(status_filter: SalesOrderStatus | None = None,
               db: Session = Depends(get_db)):
    return SalesService(db).list(status=status_filter)


@router.post("", response_model=SalesOrderOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.SALES_CREATE))])
def create_sales(payload: SalesOrderCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return SalesService(db).create(payload, user_id=current_user.id)


@router.get("/{so_id}", response_model=SalesOrderOut,
            dependencies=[Depends(require(P.SALES_VIEW))])
def get_sales(so_id: int, db: Session = Depends(get_db)):
    return SalesService(db).get(so_id)


@router.post("/{so_id}/confirm", response_model=ConfirmationResult,
             dependencies=[Depends(require(P.SALES_CONFIRM))])
def confirm_sales(so_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    """Reserve available stock and auto-trigger procurement for shortages."""
    return SalesService(db).confirm(so_id, user_id=current_user.id)


@router.post("/{so_id}/deliver", response_model=SalesOrderOut,
             dependencies=[Depends(require(P.SALES_EDIT))])
def deliver_sales(so_id: int, payload: DeliveryRequest = DeliveryRequest(),
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    """Deliver part or all of an order (reduces reserved + on_hand)."""
    return SalesService(db).deliver(so_id, payload, user_id=current_user.id)


@router.post("/{so_id}/cancel", response_model=SalesOrderOut,
             dependencies=[Depends(require(P.SALES_DELETE))])
def cancel_sales(so_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return SalesService(db).cancel(so_id, user_id=current_user.id)
