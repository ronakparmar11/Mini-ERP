"""Centralized exception handling.

Maps domain exceptions (ERPException subclasses) to clean JSON HTTP responses
with stable error codes. This is the single place HTTP status mapping happens,
keeping services framework-agnostic. Register via `register_exception_handlers`.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from utils.exceptions import ERPException

logger = logging.getLogger("mini_erp")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ERPException)
    async def handle_erp_exception(request: Request, exc: ERPException):
        # 5xx-ish business errors are warnings; client errors are info-level.
        logger.info("ERPException %s: %s", exc.code, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "validation_error",
                               "message": "Request validation failed",
                               "details": exc.errors()}},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        # Never leak internals; log full trace server-side.
        logger.exception("Unhandled error on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error",
                               "message": "An unexpected error occurred"}},
        )
