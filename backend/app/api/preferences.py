from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.preference import UserPreference
from backend.app.schemas.preference import UserPreferenceOut, UserPreferenceUpdate
from backend.app.api.deps import get_current_active_user

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("", response_model=UserPreferenceOut)
def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get preferences for the authenticated user."""
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(
            user_id=current_user.id,
            theme="light",
            default_duration=15,
            sound_enabled=True,
            gentle_reminders=True,
            gemini_personalization_enabled=False,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.put("", response_model=UserPreferenceOut)
def update_user_preferences(
    payload: UserPreferenceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update preferences for the authenticated user."""
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if payload.theme is not None:
        pref.theme = payload.theme
    if payload.default_duration is not None:
        pref.default_duration = payload.default_duration
    if payload.sound_enabled is not None:
        pref.sound_enabled = payload.sound_enabled
    if payload.gentle_reminders is not None:
        pref.gentle_reminders = payload.gentle_reminders
    if payload.gemini_personalization_enabled is not None:
        pref.gemini_personalization_enabled = payload.gemini_personalization_enabled

    db.commit()
    db.refresh(pref)
    return pref
