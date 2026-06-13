"""Aggregate every module router under one APIRouter for clean registration."""
from fastapi import APIRouter

from routes import (
    audit, auth, bom, dashboard, inventory, invoices, manufacturing, products,
    purchase, sales, users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(purchase.router)
api_router.include_router(bom.router)
api_router.include_router(manufacturing.router)
api_router.include_router(inventory.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(invoices.router)
