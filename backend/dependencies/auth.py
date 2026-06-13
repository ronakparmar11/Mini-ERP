"""Authentication & authorization FastAPI dependencies.

`get_current_user`  -> validates the bearer JWT, loads an active User.
`require(*perms)`    -> dependency factory enforcing RBAC permissions.

Routes use them declaratively:
    @router.post("/", dependencies=[Depends(require(P.SALES_CREATE))])
    def create(..., current_user: User = Depends(get_current_user)): ...
"""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.permissions import permissions_for_role
from models.user import User
from utils.config import settings
from utils.exceptions import AuthenticationError, PermissionDeniedError
from utils.security import decode_access_token

# tokenUrl is used by Swagger's "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)  # raises AuthenticationError if invalid
    user_id = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("Token missing subject")

    user = db.get(User, int(user_id))
    if user is None:
        raise AuthenticationError("User no longer exists")
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    return user


def require(*required_permissions: str):
    """Build a dependency that ensures the current user holds ALL given perms."""
    def _checker(current_user: User = Depends(get_current_user)) -> User:
        held = permissions_for_role(current_user.role)
        missing = set(required_permissions) - held
        if missing:
            raise PermissionDeniedError(
                f"Missing permission(s): {', '.join(sorted(missing))}"
            )
        return current_user
    return _checker
