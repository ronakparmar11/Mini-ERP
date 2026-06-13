"""AuthService — credential verification and token issuance."""
from __future__ import annotations

from sqlalchemy.orm import Session

from models.user import User
from schemas.auth import TokenResponse
from utils.exceptions import AuthenticationError
from utils.security import create_access_token, verify_password


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate(self, email: str, password: str) -> User:
        user = self.db.query(User).filter(User.email == email).first()
        # Constant-ish message: don't reveal whether email or password was wrong.
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("User account is disabled")
        return user

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.authenticate(email, password)
        token = create_access_token(subject=user.id, role=user.role.value)
        return TokenResponse(access_token=token, role=user.role)
