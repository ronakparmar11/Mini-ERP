"""Bill of Materials routes. Reuses Manufacturing RBAC permissions."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.bom import BoMCreate, BoMOut
from services.bom_service import BoMService

router = APIRouter(prefix="/boms", tags=["Bills of Materials"])


@router.get("", response_model=list[BoMOut],
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def list_boms(finished_product_id: int | None = None, db: Session = Depends(get_db)):
    return BoMService(db).list(finished_product_id=finished_product_id)


@router.post("", response_model=BoMOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.MANUFACTURING_CREATE))])
def create_bom(payload: BoMCreate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    return BoMService(db).create(payload, user_id=current_user.id)


@router.get("/{bom_id}", response_model=BoMOut,
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def get_bom(bom_id: int, db: Session = Depends(get_db)):
    return BoMService(db).get(bom_id)


@router.delete("/{bom_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require(P.MANUFACTURING_DELETE))])
def delete_bom(bom_id: int, db: Session = Depends(get_db)):
    BoMService(db).delete(bom_id)
