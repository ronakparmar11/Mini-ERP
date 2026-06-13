"""User administration routes (admin-only via P.USERS_MANAGE)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import require
from dependencies.permissions import P
from schemas.user import UserCreate, UserOut, UserUpdate
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut],
            dependencies=[Depends(require(P.USERS_MANAGE))])
def list_users(db: Session = Depends(get_db)):
    return UserService(db).list()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.USERS_MANAGE))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return UserService(db).create(payload)


@router.get("/{user_id}", response_model=UserOut,
            dependencies=[Depends(require(P.USERS_MANAGE))])
def get_user(user_id: int, db: Session = Depends(get_db)):
    return UserService(db).get(user_id)


@router.patch("/{user_id}", response_model=UserOut,
              dependencies=[Depends(require(P.USERS_MANAGE))])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    return UserService(db).update(user_id, payload)
