"""Mini ERP — FastAPI application entrypoint.

Wires together: CORS, centralized error handling, and the aggregated API
router. Run locally with:
    uvicorn main:app --reload --app-dir backend
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from middleware.error_handler import register_exception_handlers
from routes import api_router
from utils.config import settings

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="Mini ERP backend: inventory-centric Sales / Purchase / "
                    "Manufacturing with RBAC, audit logs and full traceability.",
    )

    # CORS — open for hackathon frontend dev; tighten origins for production.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/health", tags=["Health"])
    def health():
        return {"status": "ok", "app": settings.APP_NAME}

    return app


app = create_app()
