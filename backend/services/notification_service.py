"""NotificationService — create and manage in-app notifications for admins.

Notifications are created per-admin whenever key ERP events occur (product
created, sales order confirmed, etc.). The service participates in the
caller's existing transaction when possible — it uses db.add() without
committing, so the unit_of_work in the calling service commits everything
atomically.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from models.notification import Notification
from models.user import User
from utils.enums import Role
from utils.exceptions import NotFoundError

logger = logging.getLogger("mini_erp")


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    # ---- write ----
    def create_for_admins(self, title: str, message: str, db: Session | None = None) -> list[Notification]:
        """Create one notification per admin user.

        Adds to the current session without committing — the caller's
        unit_of_work controls the transaction boundary.
        """
        session = db or self.db
        admins = session.query(User).filter(
            User.role == Role.ADMIN,
            User.is_active == True,  # noqa: E712 — SQLAlchemy filter
        ).all()

        notifications: list[Notification] = []
        for admin in admins:
            notif = Notification(
                title=title,
                message=message,
                user_id=admin.id,
            )
            session.add(notif)
            notifications.append(notif)

        return notifications

    # ---- reads ----
    def get_notifications(self, user_id: int) -> list[Notification]:
        """Return all notifications for a user, newest first."""
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )

    def mark_as_read(self, notification_id: int, user_id: int) -> Notification:
        """Mark a single notification as read. Users can only mark their own."""
        notif = self.db.get(Notification, notification_id)
        if notif is None:
            raise NotFoundError(f"Notification {notification_id} not found")
        if notif.user_id != user_id:
            raise NotFoundError(f"Notification {notification_id} not found")
        notif.is_read = True
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def get_unread_count(self, user_id: int) -> int:
        """Return the count of unread notifications for a user."""
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712 — SQLAlchemy filter
            )
            .count()
        )
