"""Notification model — in-app notification for admin collaboration."""
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    # Relationship: notification belongs to a user.
    user = relationship("User", backref="notifications", lazy="select")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Notification {self.id} user={self.user_id} read={self.is_read}>"
