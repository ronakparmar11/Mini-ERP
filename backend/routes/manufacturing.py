"""Manufacturing order routes — CRUD + confirm + start + produce + cancel."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.manufacturing import (
    ManufacturingOrderCreate, ManufacturingOrderOut, ProduceRequest,
)
from services.manufacturing_service import ManufacturingService
from utils.enums import ManufacturingOrderStatus

router = APIRouter(prefix="/manufacturing-orders", tags=["Manufacturing Orders"])


@router.get("", response_model=list[ManufacturingOrderOut],
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def list_mo(status_filter: ManufacturingOrderStatus | None = None,
            db: Session = Depends(get_db)):
    return ManufacturingService(db).list(status=status_filter)


@router.post("", response_model=ManufacturingOrderOut,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.MANUFACTURING_CREATE))])
def create_mo(payload: ManufacturingOrderCreate, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    """Create an MO from a BoM (explodes + scales components & operations)."""
    return ManufacturingService(db).create(payload, user_id=current_user.id)


@router.get("/{mo_id}", response_model=ManufacturingOrderOut,
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def get_mo(mo_id: int, db: Session = Depends(get_db)):
    return ManufacturingService(db).get(mo_id)


@router.post("/{mo_id}/confirm", response_model=ManufacturingOrderOut,
             dependencies=[Depends(require(P.MANUFACTURING_EDIT))])
def confirm_mo(mo_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    return ManufacturingService(db).confirm(mo_id, user_id=current_user.id)


@router.post("/{mo_id}/start", response_model=ManufacturingOrderOut,
             dependencies=[Depends(require(P.MANUFACTURING_EDIT))])
def start_mo(mo_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    return ManufacturingService(db).start(mo_id, user_id=current_user.id)


@router.post("/{mo_id}/produce", response_model=ManufacturingOrderOut,
             dependencies=[Depends(require(P.MANUFACTURING_PRODUCE))])
def produce_mo(mo_id: int, payload: ProduceRequest = ProduceRequest(),
               db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    """Consume raw materials, produce finished goods, record durations."""
    return ManufacturingService(db).produce(mo_id, payload, user_id=current_user.id)


@router.post("/{mo_id}/cancel", response_model=ManufacturingOrderOut,
             dependencies=[Depends(require(P.MANUFACTURING_DELETE))])
def cancel_mo(mo_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    return ManufacturingService(db).cancel(mo_id, user_id=current_user.id)
