"""Notification routes — in-app notification bell for all authenticated users.

Endpoints:
    GET   /notifications              list notifications for the current user
    GET   /notifications/unread-count unread badge count
    PATCH /notifications/{id}/read    mark a single notification as read
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.notification import NotificationOut, UnreadCountOut
from services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return NotificationService(db).get_notifications(current_user.id)


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = NotificationService(db).get_unread_count(current_user.id)
    return UnreadCountOut(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return NotificationService(db).mark_as_read(notification_id, current_user.id)
