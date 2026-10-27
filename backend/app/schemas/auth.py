from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator


class UserRegister(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    display_name: Optional[str] = Field("Gentle Traveler", max_length=100)
    baseline_capacity: Optional[str] = Field("medium", pattern="^(low|medium|high)$")

    @field_validator("email")
    def validate_email_simple(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Please provide a valid email address.")
        return clean


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str
    baseline_capacity: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenRefreshOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    baseline_capacity: Optional[str] = Field(None, pattern="^(low|medium|high)$")


class AccountDeleteRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=256)
