"""AuditService — field-level change tracking.

`log_changes` diffs a before/after snapshot (plain dicts) and writes one
AuditLog row per changed field. Services call it within the same transaction as
the mutation, so audit data is always consistent with the records it describes.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from models.audit import AuditLog
from utils.enums import AuditModule


def _stringify(value) -> str | None:
    if value is None:
        return None
    return str(value)


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_changes(
        self,
        *,
        module: AuditModule,
        record_type: str,
        record_id: int,
        before: dict,
        after: dict,
        user_id: int | None,
    ) -> list[AuditLog]:
        """Compare two snapshots and persist a row for each differing field."""
        logs: list[AuditLog] = []
        keys = set(before) | set(after)
        for field in sorted(keys):
            old = before.get(field)
            new = after.get(field)
            if old == new:
                continue
            log = AuditLog(
                module=module,
                record_type=record_type,
                record_id=record_id,
                field_name=field,
                old_value=_stringify(old),
                new_value=_stringify(new),
                user_id=user_id,
            )
            self.db.add(log)
            logs.append(log)
        if logs:
            self.db.flush()
        return logs

    def log_creation(self, *, module, record_type, record_id, snapshot, user_id):
        """Convenience: record an entity's creation (old_value = None)."""
        return self.log_changes(
            module=module, record_type=record_type, record_id=record_id,
            before={}, after=snapshot, user_id=user_id,
        )

    def list_logs(self, *, module: AuditModule | None = None,
                  record_id: int | None = None, limit: int = 200):
        q = self.db.query(AuditLog)
        if module is not None:
            q = q.filter(AuditLog.module == module)
        if record_id is not None:
            q = q.filter(AuditLog.record_id == record_id)
        return q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
