"""UserService — user administration (admin-only at the route layer)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from database.session import unit_of_work
from models.user import User
from schemas.user import UserCreate, UserUpdate
from utils.exceptions import BusinessRuleError, NotFoundError
from utils.security import hash_password


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found")
        return user

    def list(self) -> list[User]:
        return self.db.query(User).order_by(User.id).all()

    def create(self, data: UserCreate) -> User:
        if self.db.query(User).filter(User.email == data.email).first():
            raise BusinessRuleError(f"Email {data.email} is already registered")
        with unit_of_work(self.db):
            user = User(
                name=data.name,
                email=data.email,
                password_hash=hash_password(data.password),
                role=data.role,
                is_active=data.is_active,
            )
            self.db.add(user)
        self.db.refresh(user)
        return user

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.get(user_id)
        with unit_of_work(self.db):
            if data.name is not None:
                user.name = data.name
            if data.password is not None:
                user.password_hash = hash_password(data.password)
            if data.role is not None:
                user.role = data.role
            if data.is_active is not None:
                user.is_active = data.is_active
        self.db.refresh(user)
        return user
