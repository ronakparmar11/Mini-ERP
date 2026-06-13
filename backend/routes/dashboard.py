"""Dashboard / reporting routes (read-only aggregates)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import require
from dependencies.permissions import P
from schemas.dashboard import (
    InventorySummary, LowStockProduct, ManufacturingStats, PendingOrderSummary,
)
from services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/low-stock", response_model=list[LowStockProduct],
            dependencies=[Depends(require(P.PRODUCTS_VIEW))])
def low_stock(threshold: float | None = None, db: Session = Depends(get_db)):
    return DashboardService(db).low_stock(threshold=threshold)


@router.get("/pending-sales", response_model=list[PendingOrderSummary],
            dependencies=[Depends(require(P.SALES_VIEW))])
def pending_sales(db: Session = Depends(get_db)):
    return DashboardService(db).pending_sales()


@router.get("/pending-purchases", response_model=list[PendingOrderSummary],
            dependencies=[Depends(require(P.PURCHASE_VIEW))])
def pending_purchases(db: Session = Depends(get_db)):
    return DashboardService(db).pending_purchases()


@router.get("/pending-manufacturing", response_model=list[PendingOrderSummary],
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def pending_manufacturing(db: Session = Depends(get_db)):
    return DashboardService(db).pending_manufacturing()


@router.get("/manufacturing-stats", response_model=ManufacturingStats,
            dependencies=[Depends(require(P.MANUFACTURING_VIEW))])
def manufacturing_stats(db: Session = Depends(get_db)):
    return DashboardService(db).manufacturing_stats()


@router.get("/inventory-summary", response_model=InventorySummary,
            dependencies=[Depends(require(P.PRODUCTS_VIEW))])
def inventory_summary(db: Session = Depends(get_db)):
    return DashboardService(db).inventory_summary()
