from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from utils.enums import Role


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role = Role.SYSTEM_USER
    is_active: bool = True


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    is_active: bool
    created_at: datetime
