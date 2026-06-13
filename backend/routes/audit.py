"""Audit log (read-only) routes — admin/audit permission required."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import require
from dependencies.permissions import P
from schemas.audit import AuditLogOut
from services.audit_service import AuditService
from utils.enums import AuditModule

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=list[AuditLogOut],
            dependencies=[Depends(require(P.AUDIT_VIEW))])
def list_audit(module: AuditModule | None = None, record_id: int | None = None,
               limit: int = 200, db: Session = Depends(get_db)):
    return AuditService(db).list_logs(module=module, record_id=record_id, limit=limit)
