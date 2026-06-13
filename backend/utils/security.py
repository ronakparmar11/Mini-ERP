"""Security primitives: password hashing (bcrypt) and JWT token handling.

Isolated here so the auth service and dependencies share one implementation.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from utils.config import settings
from utils.exceptions import AuthenticationError

# We call bcrypt directly (passlib is unmaintained and breaks on bcrypt>=4).
# bcrypt has a hard 72-byte limit on the input; we truncate defensively so a
# very long password never raises at runtime (standard, safe practice).
_BCRYPT_MAX_BYTES = 72


def _to_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(_to_bytes(plain_password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain_password), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed stored hash — treat as a failed verification, never crash.
        return False


def create_access_token(subject: str | int, role: str,
                        expires_minutes: int | None = None) -> str:
    """Create a signed JWT.

    `sub` carries the user id, `role` is embedded so the frontend can branch UI
    without an extra call. Expiry defaults to the configured access TTL.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode + verify a JWT, raising AuthenticationError on any problem."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.PyJWTError:
        raise AuthenticationError("Invalid authentication token")
