from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_opaque_token,
    create_access_token,
)
from backend.app.core.rate_limit import rate_limit_auth
from backend.app.core.email_sink import record_password_reset_email
from backend.app.models.user import User
from backend.app.models.auth import SessionModel, PasswordResetToken
from backend.app.models.preference import UserPreference
from backend.app.schemas.auth import (
    AccountDeleteRequest,
    UserRegister,
    UserLogin,
    UserOut,
    Token,
    RefreshTokenRequest,
    TokenRefreshOut,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserUpdate,
)
from backend.app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegister,
    request: Request,
    db: Session = Depends(get_db),
    _limiter: None = Depends(rate_limit_auth),
):
    """
    Register a new user account with Argon2id password hashing.
    Issues JWT access token and session refresh token.
    """
    normalized_email = payload.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Hash password with Argon2id
    hashed_pwd = hash_password(payload.password)
    user = User(
        email=normalized_email,
        hashed_password=hashed_pwd,
        display_name=payload.display_name or "Gentle Traveler",
        baseline_capacity=payload.baseline_capacity or "medium",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create default user preference
    pref = UserPreference(
        user_id=user.id,
        theme="light",
        default_duration=15,
        sound_enabled=True,
        gentle_reminders=True,
    )
    db.add(pref)

    # Issue refresh token and session
    raw_refresh = generate_opaque_token(48)
    refresh_hash = hash_token(raw_refresh)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    session_record = SessionModel(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(session_record)
    db.commit()
    db.refresh(user)

    # Issue access token
    access_token = create_access_token(user.id, user.email)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return Token(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
    _limiter: None = Depends(rate_limit_auth),
):
    """
    Authenticate user via email and password.
    Returns generic error to prevent email enumeration.
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Constant-time-safe generic authentication failure
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    # Issue new session and refresh token
    raw_refresh = generate_opaque_token(48)
    refresh_hash = hash_token(raw_refresh)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    session_record = SessionModel(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(session_record)
    db.commit()

    access_token = create_access_token(user.id, user.email)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return Token(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenRefreshOut)
def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Exchange valid refresh token for a fresh short-lived JWT access token.
    """
    token_hash_val = hash_token(payload.refresh_token)
    session_record = (
        db.query(SessionModel)
        .filter(SessionModel.token_hash == token_hash_val)
        .first()
    )

    now = datetime.now(timezone.utc)
    # Check if session exists, is not revoked, and is not expired
    if not session_record or session_record.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has been revoked.",
        )

    # Ensure timezone awareness comparison
    record_expires = session_record.expires_at
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if record_expires <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
        )

    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )

    new_access_token = create_access_token(user.id, user.email)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenRefreshOut(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post("/logout")
def logout(
    payload: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Revoke the provided refresh token session.
    """
    if payload and payload.refresh_token:
        token_hash_val = hash_token(payload.refresh_token)
        session_record = (
            db.query(SessionModel)
            .filter(SessionModel.token_hash == token_hash_val)
            .first()
        )
        if session_record:
            session_record.revoked_at = datetime.now(timezone.utc)
            db.commit()

    return {"message": "Logged out successfully. Take care of yourself."}


@router.get("/me", response_model=UserOut)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get profile of currently authenticated user."""
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
def update_current_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update display name or baseline capacity preference."""
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip()
    if payload.baseline_capacity is not None:
        current_user.baseline_capacity = payload.baseline_capacity

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user_account(
    payload: AccountDeleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the authenticated account after password confirmation."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The password did not match. Your account was not deleted.",
        )
    db.delete(current_user)
    db.commit()
    return None


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _limiter: None = Depends(rate_limit_auth),
):
    """
    Request password reset instructions.
    Issues single-use expiring token logged to the development email sink.
    Returns generic response to prevent user enumeration.
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if user and user.is_active:
        raw_token = generate_opaque_token(32)
        token_hash_val = hash_token(raw_token)
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash_val,
            expires_at=expires,
        )
        db.add(reset_record)
        db.commit()

        # Send to development email sink
        record_password_reset_email(user.email, raw_token)

    return {
        "message": "If an account exists with this email, password reset instructions have been generated in the development sink.",
        "email": normalized_email,
    }


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _limiter: None = Depends(rate_limit_auth),
):
    """
    Reset user password using a single-use expiring token.
    Enforces that used tokens cannot be reused.
    """
    token_hash_val = hash_token(payload.token.strip())
    reset_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash_val)
        .first()
    )

    now = datetime.now(timezone.utc)
    if not reset_record or reset_record.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or has already been used.",
        )

    token_expires = reset_record.expires_at
    if token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)

    if token_expires <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User associated with this reset link no longer exists.",
        )

    # Hash new password with Argon2id
    user.hashed_password = hash_password(payload.new_password)
    # Mark token as used immediately (single-use constraint)
    reset_record.used_at = now

    # Invalidate all existing active sessions for security
    db.query(SessionModel).filter(
        SessionModel.user_id == user.id,
        SessionModel.revoked_at.is_(None),
    ).update({"revoked_at": now})

    db.commit()

    return {
        "message": "Password has been successfully updated. You may now sign in with your new password."
    }
