from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    theme: str
    default_duration: int
    sound_enabled: bool
    gentle_reminders: bool
    gemini_personalization_enabled: bool
    updated_at: datetime


class UserPreferenceUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(light|dark|system)$")
    default_duration: Optional[int] = Field(None, ge=1, le=180)
    sound_enabled: Optional[bool] = None
    gentle_reminders: Optional[bool] = None
    gemini_personalization_enabled: Optional[bool] = None
