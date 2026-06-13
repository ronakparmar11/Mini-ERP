"""Product routes."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user, require
from dependencies.permissions import P
from models.user import User
from schemas.product import ProductCreate, ProductOut, ProductUpdate
from services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductOut],
            dependencies=[Depends(require(P.PRODUCTS_VIEW))])
def list_products(search: str | None = None, db: Session = Depends(get_db)):
    return ProductService(db).list(search=search)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require(P.PRODUCTS_CREATE))])
def create_product(payload: ProductCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    return ProductService(db).create(payload, user_id=current_user.id)


@router.get("/{product_id}", response_model=ProductOut,
            dependencies=[Depends(require(P.PRODUCTS_VIEW))])
def get_product(product_id: int, db: Session = Depends(get_db)):
    return ProductService(db).get(product_id)


@router.patch("/{product_id}", response_model=ProductOut,
              dependencies=[Depends(require(P.PRODUCTS_EDIT))])
def update_product(product_id: int, payload: ProductUpdate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    return ProductService(db).update(product_id, payload, user_id=current_user.id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require(P.PRODUCTS_DELETE))])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    ProductService(db).delete(product_id)
