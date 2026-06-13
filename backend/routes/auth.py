"""Auth routes — login (public) and current-user introspection."""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.auth import LoginRequest, TokenResponse
from schemas.user import UserOut
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, return a JWT."""
    return AuthService(db).login(payload.email, payload.password)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_oauth(form: OAuth2PasswordRequestForm = Depends(),
                db: Session = Depends(get_db)):
    """OAuth2 password-form variant so Swagger's Authorize button works.
    `username` field carries the email."""
    return AuthService(db).login(form.username, form.password)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
